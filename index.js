'use strict';

const Base = require('./lib/base');
const Translatable = require('./lib/translatable');
const LanguageDAO = require('./lib/language-dao');
const Language = require('./lib/language-model');
const generator = require('./lib/generator');

module.exports = {
    Base,
    Translatable,
    LanguageDAO,
    Language,
    generateDb: generator.generateDb,
    generateConfig: generator.generateConfig,
    Sequelize: generator.Sequelize,
};
