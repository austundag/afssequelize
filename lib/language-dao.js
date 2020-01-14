'use strict';

const Base = require('./base');

module.exports = class LanguageDAO extends Base {
    async create(language) {
        const { id } = await this.db.Language.create(language);
        return { id };
    }

    async list() {
        return this.db.Language.findAll({
            raw: true,
            attributes: ['code', 'name', 'nativeName'],
            order: ['code'],
        });
    }

    async patch(code, languageUpdate) {
        await this.db.Language.update(languageUpdate, { where: { code } });
        return {};
    }

    async delete(code) {
        return this.db.Language.destroy({ where: { code } });
    }

    async get(code) {
        return this.db.Language.findOne({
            where: { code },
            raw: true,
            attributes: ['code', 'name', 'nativeName'],
        });
    }
};
