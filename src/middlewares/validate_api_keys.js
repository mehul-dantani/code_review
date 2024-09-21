const { getByKey } = require('./../modules/api_keys/api_key.service');
const httpStatusCode = require('../configs/http_status_codes');
const { generateResponse } = require('./../utils/helper');
const { MSG_INVALID_VALUE_FORBIDDEN } = require('../configs/validation_messages');
const { appLogger } = require('../configs/winston');
const { getCache, setCache } = require('../utils/aws/cache/cache.service');
const { REDDIS_EXPIRY_ONE_YEAR } = require('../configs/constants');

const REDIS_OLD_KEY = 'api_key';
const REDIS_NEW_KEY = 'redisNew';

module.exports = async (req, res, next) => {
  try {
    const apiKey = req.header('X-api-key') || req.header('x-api-key');
    
    if (!apiKey) {
      return generateResponse(
        res,
        httpStatusCode.FORBIDDEN,
        false,
        'API key is missing in request.'
      );
    }

    // Check cache for API key
    let dbApiKey = await getCache(REDIS_OLD_KEY) || await getCache(REDIS_NEW_KEY);

    // If API key not found in cache, fetch from DB and set cache
    if (!dbApiKey) {
      const dbApiKeyData = await getByKey(apiKey);
      dbApiKey = dbApiKeyData?.key;

      if (dbApiKey) {
        await setCache(REDIS_OLD_KEY, dbApiKey, REDDIS_EXPIRY_ONE_YEAR);
      }
    }

    // Validate API key
    if (!dbApiKey || dbApiKey !== apiKey) {
      return generateResponse(
        res,
        httpStatusCode.FORBIDDEN,
        false,
        'You need to pass a valid API key.'
      );
    }

    return next();
  } catch (error) {
    appLogger.error(`${req.route.path} | ${error.stack}`);
    
    const isSequelizeError = ['SequelizeDatabaseError', '22P02', '23956'].includes(error.name || error.code);
    const errorMessage = isSequelizeError ? MSG_INVALID_VALUE_FORBIDDEN : error.message;

    return generateResponse(
      res,
      httpStatusCode.FORBIDDEN,
      false,
      errorMessage
    );
  }
};
