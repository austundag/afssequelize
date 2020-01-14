'use strict';

const Sequelize = require('sequelize');
const _ = require('lodash');

const Base = require('./base');

const { Op } = Sequelize;

module.exports = class Translatable extends Base {
    constructor(db, tableName, parentIdField, textFields = ['text'], optionals = {}) {
        super(db);
        this.tableName = tableName;
        this.parentIdField = parentIdField;
        this.textFields = textFields;
        this.optionals = optionals;
    }

    createRecord(input, inputLanguage) {
        const language = inputLanguage || input.language || 'en';
        const record = { language };
        record[this.parentIdField] = input.id;
        this.textFields.forEach((field) => {
            let value = input[field];
            if (value === undefined) {
                value = null;
            }
            record[field] = value;
        });
        return record;
    }

    async createTextTx(input, transaction) {
        const Table = this.db[this.tableName];
        const { parentIdField } = this;
        const language = input.language || 'en';
        const where = { language };
        where[parentIdField] = input.id;
        await Table.destroy({ where, transaction })
        const record = this.createRecord(input);
        await Table.create(record, { transaction })
        return input
    }

    async deleteTextTx(parentId, transaction) {
        const Table = this.db[this.tableName];
        const { parentIdField } = this;
        const where = {
            [parentIdField]: parentId,
        };
        return Table.destroy({ where, transaction });
    }

    async createMultipleTextsTx(inputs, inputLanguage, transaction) {
        const Table = this.db[this.tableName];
        const { parentIdField } = this;
        const ids = inputs.map((input) => input.id);
        const language = inputLanguage || 'en';
        const where = { language, [parentIdField]: { [Op.in]: ids } };
        await Table.destroy({ where, transaction })
        const records = inputs.map((input) => this.createRecord(input, language));
        return Table.bulkCreate(records, { transaction });
    }

    async createText(input) {
        return this.transaction((transaction) => this.createTextTx(input, transaction));
    }

    async createMultipleTexts(input) {
        return this.transaction((transaction) => this.createMultipleTextsTx(input, transaction));
    }

    async getText(parentId, language = 'en') {
        const Table = this.db[this.tableName];
        const where = { language };
        where[this.parentIdField] = parentId;
        const query = { where, raw: true, attributes: this.textFields };
        const result = await Table.findOne(query);
        if ((language === 'en') || result) {
            return result;
        }
        query.where.language = 'en';
        return Table.findOne(query);
    }

    updateTextFields(parent, fieldValues) {
        if (fieldValues) {
            this.textFields.forEach((field) => {
                const value = fieldValues[field];
                if (value !== null) {
                    parent[field] = fieldValues[field]; // eslint-disable-line no-param-reassign
                } else if (!this.optionals[field]) {
                    parent[field] = ''; // eslint-disable-line no-param-reassign
                }
            });
        }
        return parent;
    }

    async updateText(parent, language) {
        const result = await this.getText(parent.id, language);
        this.updateTextFields(parent, result);
        return parent;
    }

    async getAllTexts(ids, language = 'en') {
        const Table = this.db[this.tableName];
        const { parentIdField } = this;
        const options = { raw: true, attributes: [parentIdField, 'language', ...this.textFields] };
        if (language === 'en') {
            _.set(options, 'where.language', 'en');
        } else {
            _.set(options, 'where.language', { [Op.in]: ['en', language] });
        }
        _.set(options, `where.${parentIdField}`, { [Op.in]: ids });
        const records = await Table.findAll(options);
        if (language === 'en') {
            return _.keyBy(records, parentIdField);
        }
        const enRecords = _.remove(records, (r) => r.language === 'en');
        const map = _.keyBy(records, parentIdField);
        enRecords.forEach((record) => {
            const parentId = record[parentIdField];
            if (!map[parentId]) {
                map[parentId] = record;
                records.push(record);
            }
        });
        return map;
    }

    async updateAllTexts(parents, language, idField = 'id') {
        const ids = _.map(parents, idField);
        const map = await this.getAllTexts(ids, language);
        parents.forEach((parent) => this.updateTextFields(parent, map[parent[idField]]));
        return parents;
    }
};
