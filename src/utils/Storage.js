"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.config = void 0;
// External libs
const path_1 = __importDefault(require("path"));
// Internal libs
const Structures_1 = require("./Structures");
exports.config = new Structures_1.Config(path_1.default.resolve('./config.json'));
exports.server = { app: undefined, server: undefined };
