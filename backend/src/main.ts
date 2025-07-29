import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Server } from 'socket.io';
import { HttpAdapterHost } from '@nestjs/core';
import { IndicatorService } from './modules/indicator-module/indicator.service';


// Declare global variable to store Socket.IO instance
declare global {
  var socketIoInstance: Server | null;
}

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the configured IP for axios
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3040);
  console.log(`✅ Server running on http://localhost:3040`);
}
bootstrap();

