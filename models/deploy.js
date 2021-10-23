'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Deploy extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            Deploy.belongsTo(models.Block, {
              foreignKey: 'block',
              targetKey: 'hash'
            })
        }
    }
    Deploy.init({
        hash: {
            type: DataTypes.STRING, allowNull: false, primaryKey: true
        },
        from: DataTypes.STRING,
        cost: DataTypes.STRING,
        result: DataTypes.BOOLEAN,
        timestamp: DataTypes.DATE,
        block: {
            type: DataTypes.STRING, references: {
                model: 'blocks',
                key: 'hash',
            },
        },
        type: DataTypes.STRING,
        data: DataTypes.JSONB
    }, {
        sequelize,
        tableName: 'deploys',
        modelName: 'Deploy',
        timestamps: false,
    });
    return Deploy;
};
