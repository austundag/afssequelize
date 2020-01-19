'use strict';

const Sequelize = require('sequelize');
const pg = require('pg');
const _ = require('lodash');

pg.types.setTypeParser(1184, (value) => value);

const sequelizeGenerator = function(configdb) {
    const { name, user, pass } = configdb;
    const sequelize = new Sequelize(name, user, pass, configdb.options);
    return { Sequelize, sequelize };
};

const extractSchema = function extractSchema(schemaSpec) {
    const schemas = schemaSpec.split('~');
    if (schemas.length > 1) {
        return schemas;
    }
    return schemaSpec;
};

exports.Sequelize = Sequelize;

exports.generateConfig = function generateConfig(envPrefix) {
    const defaultConfig = {
        name: 'recreg',
        host: 'localhost',
        port: '5432',
        schema: 'public',
        options: {
            dialect: 'postgres',
            dialectOptions: {
                ssl: false,
            },
            pool: {
                max: 5,
                min: 0,
                idle: 10000,
            },
        },
    };

    const envConfig = {
        name: process.env[`${envPrefix}_DB_NAME`],
        user: process.env[`${envPrefix}_DB_USER`],
        pass: process.env[`${envPrefix}_DB_PASS`],
        schema: process.env[`${envPrefix}_DB_SCHEMA`],
        options: {
            host: process.env[`${envPrefix}_DB_HOST`],
            port: process.env[`${envPrefix}_DB_PORT`],
            dialect: process.env[`${envPrefix}_DB_DIALECT`],
            dialectOptions: {
                ssl: process.env[`${envPrefix}_DB_SSL`],
            },
            pool: {
                max: process.env[`${envPrefix}_DB_POOL_MAX`],
                min: process.env[`${envPrefix}_DB_POOL_MIN`],
                idle: process.env[`${envPrefix}_DB_POOL_IDLE`],
            },
        },
    };

    const config = _.merge(defaultConfig, envConfig);
    config.schema = extractSchema(config.schema);
    return config; 
};

exports.generateDb = function generateDb(config) {
    const configdb = _.cloneDeep(config);
 
    const schemaSpec = configdb.schema;

    if (Array.isArray(schemaSpec)) {
        _.set(configdb, 'options.dialectOptions.prependSearchPath', true);
        const { Sequelize, sequelize } = sequelizeGenerator(configdb);
        const tables = schemaSpec.reduce((r, schema) => {
            const schemaTables = configdb.defineTables(sequelize, Sequelize, schema);
            r[schema] = schemaTables;
            return r;
        }, {});
        return { sequelize, schemas: schemaSpec, ...tables };
    }

    _.set(configdb, 'options.dialectOptions.prependSearchPath', schemaSpec !== 'public');
    const { Sequelize, sequelize } = sequelizeGenerator(configdb);
    const schemaTables = configdb.defineTables(sequelize, Sequelize, schemaSpec);
    return { sequelize, ...schemaTables };
};
