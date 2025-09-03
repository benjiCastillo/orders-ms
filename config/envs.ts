import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
  PRODUCTS_MICROSERVICE_HOST: string;
  PRODUCTS_MICROSERVICE_PORT: number;
}

const envVarsSchema = joi
  .object<EnvVars>({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    PRODUCTS_MICROSERVICE_HOST: joi.string().required(),
    PRODUCTS_MICROSERVICE_PORT: joi.number().required(),
  })
  .unknown(true);

const envVarsResult = envVarsSchema.validate(process.env);

if (envVarsResult.error) {
  throw new Error(
    `Configuration validation error: ${envVarsResult.error.message}`,
  );
}

const envVars = envVarsResult.value;

console.log(envVars.PORT);

export const envs = {
  port: envVars.PORT,
  databaseUrl: envVars.DATABASE_URL,
  productsMicroserviceHost: envVars.PRODUCTS_MICROSERVICE_HOST,
  productsMicroservicePort: envVars.PRODUCTS_MICROSERVICE_PORT,
};
