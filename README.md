# OrderFlow

A simplified e-commerce system built with event-driven microservices in NestJS. Learning project focused on Event-Driven Architecture (EDA), the Saga pattern (choreography), the Outbox pattern, and inter-service communication via RabbitMQ and gRPC.

## Architecture

```
                    ┌─────────────┐
   HTTP client ───▶ │ api-gateway │
                    └──────┬──────┘
                           │ gRPC (migrating from TCP)
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌─────────────┐   ┌─────────────────┐  ┌─────────────────┐
 │orders-service│   │inventory-service│  │ payment-service │
 └──────┬──────┘   └────────┬────────┘  └────────┬────────┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                              ▼
                     ┌─────────────────┐
                     │ RabbitMQ         │
                     │ orderflow.events │
                     │ (topic exchange) │
                     └─────────────────┘
```

Each service has its own Postgres database (no service queries another service's DB directly) and talks to the others exclusively through events.

## Services

### api-gateway
The system's single HTTP entry point. No business logic or database of its own — it only routes traffic to the right service. Talks to each service synchronously (originally TCP, migrating to gRPC).

### orders-service
- Exposes `POST /order`, `GET /order`, `GET /order/:id` (via the gateway)
- When an order is created, it saves the order and an `order.created` event in the same Postgres transaction (Outbox pattern)
- An `OutboxPublisher` (polling every 1s) reads pending events and publishes them to RabbitMQ
- Listens for `stock.reserved`, `stock.rejected`, `payment.approved`, `payment.failed` to update the order's status
- DB: Postgres, port `5432`, ORM: Prisma

### inventory-service
- Maintains the product catalog with `available_stock` and `reserved_stock` tracked separately
- Listens for `order.created` and reserves stock atomically per product (`UPDATE ... WHERE available_stock >= quantity`), preventing race conditions between simultaneous orders
- All-or-nothing reservation: if any item is out of stock, it rolls back any partial reservation from the same order
- Publishes `stock.reserved` or `stock.rejected` (via its own Outbox)
- DB: Postgres, port `5433`, ORM: Prisma

### payment-service
- Listens for `stock.reserved` and creates a payment record in `PENDING` status
- Exposes `ConfirmPayment` over gRPC: triggered when the user confirms the purchase from the gateway (not automatically upon stock reservation)
- Simulates the charge (simulated success/failure) and publishes `payment.approved` or `payment.failed`
- DB: Postgres, port `5434`, ORM: Prisma

## Patterns implemented

**Outbox pattern** — any service that publishes events first saves them to an `outbox_events` table, in the same transaction as the underlying data change. A separate poller (`OutboxPublisher`) reads them and publishes to RabbitMQ, marking them as published. This guarantees an event is never lost even if the process crashes between saving the data and publishing the message.

**Choreographed Saga** — there's no central orchestrator. Each service reacts to the events it cares about and decides its own action (including compensations, like releasing reserved stock if payment fails). Services don't know about each other, only about the events exchange.

**Atomic stock reservation** — checking "is there enough stock" and decrementing it happen in a single database operation (a conditional `UPDATE`), not in two separate steps (read, decide, write), preventing two simultaneous orders from reserving the same unit of stock.

**Eventual consistency** — a client creating an order gets an immediate response (`PENDING`), but the real outcome (confirmed or cancelled) resolves asynchronously. The client polls `GET /order/:id` for the current status.

## Stack

- **Framework**: NestJS
- **Messaging**: RabbitMQ (`@nestjs/microservices`, RMQ transport, topic exchange with `wildcards: true`)
- **Synchronous gateway ↔ service communication**: gRPC (Protocol Buffers)
- **Persistence**: PostgreSQL, one container per service
- **ORM**: Prisma (with `@prisma/adapter-pg`)
- **Infra**: Docker Compose (RabbitMQ + one Postgres instance per service)

## Getting it running

```bash
# 1. Bring up infrastructure (RabbitMQ + per-service Postgres)
docker compose up -d

# 2. For each service (api-gateway, order-service, inventory-service, payment-service):
cd services/<service>
npm install
npx prisma migrate dev   # only for services with their own DB
npm run start:dev
```

RabbitMQ management UI: `http://localhost:15672` (guest/guest) — useful for inspecting exchanges, queues, and in-flight messages while testing the flow.

## Shared contracts (`.proto`)

`.proto` files live centralized in `/proto` at the repo root (single source of truth) and get copied into each service that needs them before building:

```bash
npm run sync-proto   # inside each service, copies its corresponding .proto file(s)
```

Avoids keeping manually-maintained, easily-desynced copies between the gateway and each service.

## Full flow 

1. `POST /order` → `orders-service` creates the order (`PENDING`) → outbox → `order.created`
2. `inventory-service` listens for `order.created` → reserves stock atomically → outbox → `stock.reserved`
3. `payment-service` listens for `stock.reserved` → creates a `PENDING` payment
4. User confirms the purchase → gateway calls `ConfirmPayment` (gRPC) → `payment-service` simulates the charge → publishes `payment.approved` or `payment.failed`
5. `orders-service` listens for the payment outcome → confirms or cancels the order
6. If payment fails, `inventory-service` listens for `payment.failed` and releases the reserved stock (compensation)

## Project status

- [x] `orders-service` complete (API, Outbox, consumer for events coming back)
- [x] `inventory-service`: atomic stock reservation, Outbox
- [x] `payment-service`: pending payment creation, confirmation via gRPC
- [x] Migrating gateway ↔ service communication from TCP to gRPC 
- [ ] Full compensation: releasing stock when payment fails (in progress)
- [ ] `notification-service`

## Key takeaways from the project

### System design decisions

- **Why choreography over orchestration**: no service owns the full picture of the saga. Each service only knows the events it publishes and the events it reacts to, which keeps services genuinely decoupled — a new service (e.g. `notification-service`) can start listening to existing events without any other service knowing it exists. The trade-off is that the overall flow isn't visible in one place; it has to be reconstructed by reading each service's handlers, which is a real cost as the number of event types grows.
- **One database per service, no exceptions**: `orders-service` never queries inventory's or payment's tables directly, even for read-only convenience. This forced every cross-service need (does this product exist? is there stock?) to go through an event or an RPC call instead of a shortcut query, which is what actually makes the services independently deployable.
- **Splitting synchronous and asynchronous communication into two separate transports**: gateway ↔ service calls (create an order, confirm a payment) use gRPC/TCP because there's a caller waiting for an immediate answer; service ↔ service coordination (stock reserved, payment failed) uses RabbitMQ because no one is waiting synchronously and the message must survive a crash. Mixing these — e.g. trying to fire Outbox events through a request-response client — doesn't fit: a poller publishing on its own schedule isn't "a client waiting for a response."
- **Deferring payment until explicit user confirmation, not automatically after stock reservation**: modeling the real UX flow (reserve stock → show subtotal → user clicks "buy") meant `payment-service` needed two distinct entry points — a RabbitMQ listener that creates a `PENDING` payment record, and a separate gRPC call that actually triggers the charge. This is a case where the event flow alone wasn't enough to represent the business process; a synchronous trigger was still necessary at the right point.
- **Rejecting partial fulfillment**: when stock is insufficient for any single item, the entire order is cancelled rather than silently dropping that item and continuing with the rest. Partial fulfillment would require recalculating totals, deciding what "accepting a smaller order" even means to the client, and re-triggering only part of the saga — complexity that wasn't worth it for what this project is meant to teach.

### Saga and Outbox implementation details

- **Outbox writes happen in the same DB transaction as the business data change** (e.g. `tx.order.create()` and `tx.outboxEvent.create()` inside the same `$transaction`), never as two separate calls — that's the entire point of the pattern. A separate, unrelated transaction later is used only for writing *rejection* events after a rollback, since those can't live inside the transaction that just got rolled back.
- **All-or-nothing reservation inside a single transaction**: looping over an order's items, throwing as soon as one item can't be reserved causes Prisma to roll back every `UPDATE` already applied to earlier items in that same loop — no manual compensation code needed for that specific case, since it's still a single atomic unit of work.
- **The Outbox publisher is a plain `setInterval` in the same process**, not a separate worker, message queue library, or cron job — polling a table, publishing what's pending, marking it as published, one small batch at a time (`take: 20`) to avoid a large backlog blocking a single interval tick.
- **Idempotency on the consuming side**: before applying an event's effect, each consumer checks whether the target record is still in a state where that event makes sense (e.g. an order consumer ignores `stock.reserved` if the order is no longer `PENDING`), so a duplicate delivery from RabbitMQ doesn't double-apply an effect.
- **Compensation is just another event handler, not a special mechanism**: when `payment.failed` arrives, `inventory-service` runs an ordinary `UPDATE` to give the stock back — there's no built-in "undo" feature in the architecture, compensating actions are business logic like any other, triggered by an event like any other.

### Error handling

- **HTTP exceptions only make sense in the gateway's controllers.** Throwing `NotFoundException` (or similar) inside a `@MessagePattern`/`@EventPattern`/`@GrpcMethod` handler doesn't translate to anything meaningful — Nest serializes it as a generic, contextless error on the caller's side. Every microservice-side error path uses `RpcException` instead, and the gateway is the only place that maps a caught error back into an HTTP exception for the real end client.
- **The `RpcException` payload shape differs by transport**: over TCP, a plain `{ status, message }` object was enough; over gRPC, the `code` needs to be one of `@grpc/grpc-js`'s actual status codes (`NOT_FOUND`, `INTERNAL`, etc.) for the client library to serialize the response correctly — reusing an arbitrary numeric code silently breaks serialization on the gRPC side.
- **RabbitMQ errors and gRPC errors need fundamentally different handling**, because one is fire-and-forget and the other has a caller waiting: an `@EventPattern` handler's job on failure is to log clearly and decide whether to let the message be requeued/dead-lettered or drop it, while a `@GrpcMethod`'s job is to always return a well-formed error the caller can branch on.
- **Global exception filters don't apply to microservice transports in a hybrid app for free** — `app.useGlobalFilters()` only covers the HTTP side; each `connectMicroservice()` call returns its own instance, and the filter has to be registered on that specific instance (or applied per-controller with `@UseFilters()`), one filter per transport since RMQ and gRPC need different translation logic.
- **A caught database error isn't automatically the right business error**: a Prisma "record not found" on update needed to be explicitly distinguished from a generic database failure to return a real 404 instead of a 500 — otherwise every failure looks the same to the client regardless of cause.

### Other things that shaped the design

- The practical difference between fire-and-forget messaging (RabbitMQ, `@EventPattern`) and request-response (gRPC/TCP, `@GrpcMethod`), and why the Outbox pattern fits better with its own poller than with `@nestjs/microservices`'s event-emitting client
- How Nest handles hybrid apps (multiple microservice transports living in the same process) and why they need an explicit `app.init()` in addition to `startAllMicroservices()`
- Why routing keys matter even when message payloads already identify the event type: they're what the broker uses to route to the right queue *before* any application code runs, not just a naming convention
