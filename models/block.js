'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Block extends Model {
    }
    Block.init({
        hash: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
        era: DataTypes.BIGINT,
        timestamp: DataTypes.DATE,
        height: DataTypes.BIGINT,
        era_end: DataTypes.BOOLEAN,
        validated: DataTypes.BOOLEAN
    }, {
        sequelize,
        tableName: 'blocks',
        modelName: 'Block',
        timestamps: false,
    });
    return Block;
};
