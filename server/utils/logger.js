import log4js from 'log4js';

export function getLogger(moduleName) {
    let logger = log4js.getLogger(moduleName);
    log4js.configure('server/config/log4js.json');
	return logger;
}
  
export default getLogger;



