const base=require('./playwright.local.config.cjs');
module.exports={...base,outputDir:'../p1-browser-artifacts',use:{...base.use,baseURL:'http://127.0.0.1:5611'}};
