import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
}

const envVarsSchema = joi
  .object<EnvVars>({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
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
};
