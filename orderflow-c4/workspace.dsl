workspace "OrderFlow" "Sistema de e-commerce basado en eventos, microservicios y saga orquestada" {

    model {
        customer = person "Cliente" "Compra productos en la tienda"

        orderFlow = softwareSystem "OrderFlow" "Plataforma de e-commerce event-driven" {

            ordersService = container "Orders Service" "Crea y gestiona órdenes" "NestJS" "microservice"
            inventoryService = container "Inventory Service" "Reserva y libera stock" "NestJS" "microservice"
            paymentService = container "Payment Service" "Procesa pagos" "NestJS" "microservice"
            notificationService = container "Notification Service" "Envía notificaciones al cliente" "NestJS" "microservice"
            sagaOrchestrator = container "Saga Orchestrator" "Coordina la saga orquestada y persiste su estado" "NestJS" "microservice"

            rabbitmq = container "RabbitMQ" "Message broker para eventos y comandos" "RabbitMQ" "broker"

            ordersDb = container "Orders DB" "Datos de órdenes" "PostgreSQL" "database"
            inventoryDb = container "Inventory DB" "Datos de stock" "PostgreSQL" "database"
            paymentDb = container "Payment DB" "Datos de pagos/transacciones" "PostgreSQL" "database"
            sagaDb = container "Saga State DB" "Estado persistido de cada saga (para resumir tras crash/downtime)" "PostgreSQL" "database"

            # Relaciones cliente -> sistema
            customer -> ordersService "Crea una orden" "HTTP"

            # Orquestador coordina cada paso de la saga
            sagaOrchestrator -> ordersService "Comando: crear/cancelar orden" "RabbitMQ"
            sagaOrchestrator -> inventoryService "Comando: reservar/liberar stock" "RabbitMQ"
            sagaOrchestrator -> paymentService "Comando: procesar/revertir pago" "RabbitMQ"
            sagaOrchestrator -> notificationService "Comando: notificar resultado" "RabbitMQ"
            sagaOrchestrator -> sagaDb "Lee/escribe estado de la saga" "SQL"

            # Servicios publican eventos de vuelta al orquestador vía el broker
            ordersService -> rabbitmq "Publica OrderCreated / OrderCancelled"
            inventoryService -> rabbitmq "Publica StockReserved / StockReservationFailed"
            paymentService -> rabbitmq "Publica PaymentSucceeded / PaymentFailed"
            notificationService -> rabbitmq "Publica NotificationSent"
            sagaOrchestrator -> rabbitmq "Consume eventos / publica comandos"

            # Cada servicio con su propia base de datos
            ordersService -> ordersDb "Lee/escribe" "SQL"
            inventoryService -> inventoryDb "Lee/escribe" "SQL"
            paymentService -> paymentDb "Lee/escribe" "SQL"
        }
    }

    views {
        systemContext orderFlow "Contexto" {
            include *
            autoLayout
        }

        container orderFlow "Contenedores" {
            include *
            autoLayout
        }

        # Ejemplo de vista de componentes, completar cuando definas
        # los componentes internos del Saga Orchestrator (handler, repositorio, etc.)
        # component sagaOrchestrator "Componentes-Orquestador" {
        #     include *
        #     autoLayout
        # }

        styles {
            element "microservice" {
                shape RoundedBox
                background #1168bd
                color #ffffff
            }
            element "broker" {
                shape Pipe
                background #f58220
                color #ffffff
            }
            element "database" {
                shape Cylinder
                background #6c757d
                color #ffffff
            }
        }
    }

}

