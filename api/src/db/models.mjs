import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DataTypes, Sequelize } from 'sequelize';
import { env } from '../config/env.mjs';
if (env.storage !== ':memory:') mkdirSync(path.dirname(env.storage), { recursive: true });
export const sequelize = new Sequelize({ dialect: 'sqlite', storage: env.storage, logging: false });
export const Event = sequelize.define('Event', {
  title: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  location: { type: DataTypes.STRING(120), allowNull: false },
  startsAt: { type: DataTypes.DATE, allowNull: false },
  capacity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } }
});

export const Registration = sequelize.define('Registration', {
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(254), allowNull: false }
}, { indexes: [{ unique: true, fields: ['eventId', 'email'] }] });

Event.hasMany(Registration, { foreignKey: { name: 'eventId', allowNull: false }, onDelete: 'CASCADE' });
Registration.belongsTo(Event, { foreignKey: 'eventId' });


export const MailJob = sequelize.define('MailJob', {
  recipient: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { indexes: [{ fields: ['nextAttemptAt'] }] });
