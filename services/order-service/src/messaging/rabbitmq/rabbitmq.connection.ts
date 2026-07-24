import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import * as amqp from "amqplib";

export const EXCHANGE_NAME = "orderflow.events";

@Injectable()
export class RabbitMQConnection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConnection.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url =
    process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";
  private reconnectAttempt = 0;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage(
    msg: amqp.ConsumeMessage,
    queueName: string,
    handler: (payload: unknown, routingKey: string) => Promise<void>,
    channel: amqp.Channel,
  ): Promise<void> {
    try {
      const payload: unknown = JSON.parse(msg.content.toString());
      await handler(payload, msg.fields.routingKey);
      channel.ack(msg);
    } catch (err) {
      this.logger.error(
        `Error procesando mensaje de ${queueName}: ${(err as Error).message}`,
      );
      channel.nack(msg, false, false);
    }
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(EXCHANGE_NAME, "topic", {
        durable: true,
      });

      this.reconnectAttempt = 0;
      this.logger.log("Conectado a RabbitMQ");

      this.connection.on("close", () => {
        this.logger.warn("Conexión a RabbitMQ cerrada, reintentando...");
        this.scheduleReconnect();
      });

      this.connection.on("error", (err) => {
        this.logger.error(`Error en conexión RabbitMQ: ${err.message}`);
      });
    } catch (err) {
      this.logger.error(
        `No se pudo conectar a RabbitMQ: ${(err as Error).message}`,
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempt++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 30_000);
    setTimeout(() => {
      void this.connect();
    }, delay);
  }

  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error("Canal de RabbitMQ no disponible todavía");
    }
    return this.channel;
  }

  publish(routingKey: string, payload: unknown): boolean {
    const channel = this.getChannel();
    const body = Buffer.from(JSON.stringify(payload));

    return channel.publish(EXCHANGE_NAME, routingKey, body, {
      persistent: true,
      contentType: "application/json",
    });
  }

  async consume(
    queueName: string,
    routingKeys: string[],
    handler: (payload: any, routingKey: string) => Promise<void>,
  ): Promise<void> {
    const channel = this.getChannel();
    const dlxName = `${EXCHANGE_NAME}.dlx`;
    const dlqName = `${queueName}.dlq`;

    await channel.assertExchange(dlxName, "fanout", { durable: true });
    await channel.assertQueue(dlqName, { durable: true });
    await channel.bindQueue(dlqName, dlxName, "");

    await channel.assertQueue(queueName, {
      durable: true,
      deadLetterExchange: dlxName,
    });

    for (const routingKey of routingKeys) {
      await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey);
    }

    await channel.prefetch(1);

    await channel.consume(queueName, (msg) => {
      if (!msg) return;
      void this.handleMessage(msg, queueName, handler, channel);
    });

    this.logger.log(`Escuchando ${queueName} (${routingKeys.join(", ")})`);
  }
}
