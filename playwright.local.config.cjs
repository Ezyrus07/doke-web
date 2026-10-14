const base = require('./playwright.config.js');
module.exports = { ...base, testDir:'./tests/e2e', workers:1, reporter:[['list']], outputDir:'../browser-artifacts', use:{...base.use,actionTimeout:10000,baseURL:'http://127.0.0.1:5609'}, webServer:undefined };
