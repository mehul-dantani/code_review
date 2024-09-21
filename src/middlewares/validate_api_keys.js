const { getByKey } = require('./../modules/api_keys/api_key.service')
const httpStatusCode = require('../configs/http_status_codes')
const { generateResponse } = require('./../utils/helper')
const { MSG_INVALID_VALUE_FORBIDDEN } = require('../configs/validation_messages')
const { appLogger } = require('../configs/winston')
const { getCache, setCache } = require('../utils/aws/cache/cache.service')
const { REDDIS_EXPIRY_ONE_YEAR } = require('../configs/constants')

module.exports = async (req, res, next) => {
  try {
    const apiKey = req.header('X-api-key') || req.header('x-api-key')
    if (!apiKey) {
      throw new Error('API key is missing in request.')
    }
    const redisKey = 'api_key'
    let dbApiKey = await getCache(redisKey)
    //try new key if data not found with old
    if (!dbApiKey) {
      dbApiKey = await getCache(`redisNew`)
    }
    if (!dbApiKey) {
      dbApiKey = await getByKey(apiKey)
      dbApiKey = dbApiKey.key
      await setCache(redisKey, dbApiKey, REDDIS_EXPIRY_ONE_YEAR) // 1 year expiry
    }
    if (!dbApiKey || dbApiKey !== apiKey) {
      throw new Error('You need to pass a valid api key')
    }

    return next()
  } catch (error) {
    appLogger.error(`${req.route.path} | params: ${JSON.stringify(req.params)} | ${error.stack}`)
    if (error.name === 'SequelizeDatabaseError' || error.code === '22P02' || error.code === '23956') {
      return generateResponse(
        res,
        httpStatusCode.FORBIDDEN,
        false,
        MSG_INVALID_VALUE_FORBIDDEN
      )
    }
    return generateResponse(
      res,
      httpStatusCode.FORBIDDEN,
      false,
      error.message
    )
  }
}
