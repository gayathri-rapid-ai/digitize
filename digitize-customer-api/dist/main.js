"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    const config = new swagger_1.DocumentBuilder().setTitle('Digitize Customer API').setDescription('Public catalog, customer accounts, and orders').setVersion('1.0').addBearerAuth().build();
    swagger_1.SwaggerModule.setup('api/public/docs', app, swagger_1.SwaggerModule.createDocument(app, config));
    await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
//# sourceMappingURL=main.js.map