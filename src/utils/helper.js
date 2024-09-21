const httpStatusCode = require('./../configs/http_status_codes')
const { FirebaseDynamicLinks } = require('firebase-dynamic-links')
const { FIREBASE_WEB_API_KEY, TYPE_OF_MEMBER, USER_TYPE_PROSPECT, NextDuePaymentCycleStartDays, CancellationCharge } = require('../configs/constants')
const moment = require('moment-timezone')
const { getClub } = require('../modules/clubs/club.service')
const { MSG_INVALID_CLUB } = require('../configs/validation_messages')
const axios = require('axios')
const { promisify } = require('util')
const fs = require('fs')
const crypto = require('crypto')

/**
 * Generate random alphanumeric string.
 *
 * @async
 * @function
 *
 * @param {number} length
 *
 * @returns {String}
 */
function generateRandomString (length) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
}

/**
 * Generate http response for express api in JSON format.
 *
 * @function
 *
 * @param {Object} res Express server response object
 * @param {number} [code=httpStatusCode.OK]
 * @param {boolean} [success=true]
 * @param {string} [message='']
 * @param {null} [data=null]
 *
 * @returns {Object}
 */
function generateResponse (res, code = httpStatusCode.OK, success = true, message = '', data = null, errCode = null) {
  const responseObj = {
    success,
    message
  }

  if (data) {
    responseObj.data = data
  }

  if (errCode) {
    responseObj.errCode = errCode
  }

  return res.status(code).json(responseObj)
}

/**
 * Format request validator error response
 *
 * @function
 *
 * @param {Object} errors
 * @param {Boolean} [all_errors=false]
 *
 * @returns {String}
 */
function formatRequestValidatorErrors (errors, allErrors = false) {
  let errorMessage = ''
  errors.forEach(error => {
    if (errorMessage === '') {
      errorMessage += error.message
    } else {
      errorMessage += ', ' + error.message
    }

    // if (!allErrors) {
    // }
  })

  errorMessage = errorMessage.replaceAll('\\"', '')

  return errorMessage
}

/**
 * Generate dynamic link using Firebase.
 *
 * @async
 * @function
 *
 * @param {string} link
 *
 * @returns {String}
 */
async function firebaseDynamicLinksGenerator (link) {
  const firebaseDynamicLinks = new FirebaseDynamicLinks(FIREBASE_WEB_API_KEY)
  return await firebaseDynamicLinks.createLink({
    dynamicLinkInfo: {
      domainUriPrefix: 'https://chuzefitnessapp.page.link',
      link,
      androidInfo: {
        androidPackageName: 'com.chuzefitness'
      },
      iosInfo: {
        iosBundleId: 'com.chuzefitness'
      }
    },
    suffix: { option: 'SHORT' }
  })
}

function convertDateTimeToTZ (datetime, zone, withTimeZone = false, momentObject = false) {
  if (!datetime) {
    throw new Error('Invalid or missing date time.')
  }
  datetime = moment(datetime, 'YYYY-MM-DDTHH:mm:ss.SSSZ')
  let timeZone = 'EDT'
  switch (zone) {
    case 'PDT':
    case 'PST':
      timeZone = 'America/Los_angeles'
      break
    case 'EDT':
    case 'EST':
      timeZone = 'America/New_york'
      break
    case 'MST':
      timeZone = 'America/Phoenix'
      break
    case 'MDT':
      timeZone = 'America/Denver'
      break
    case 'AKST':
      timeZone = 'America/Anchorage'
      break
    case 'CDT':
      timeZone = 'America/Chicago'
      break
    default:
      timeZone = 'America/New_york'
      break
  }
  return withTimeZone
    ? momentObject
      ? moment(datetime).tz(timeZone)
      : moment(datetime).tz(timeZone).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
    : momentObject
      ? moment(datetime).tz(timeZone)
      : moment(datetime).tz(timeZone).format('YYYY-MM-DD HH:mm:ss')
}

// Used to convert string to Init Cap
function initCap (data) {
  return data.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function removeWhiteSpace (text) {
  return text.replace(/\s{2,}/g, ' ').trim()
}
function getShortenedName (fullName) {
  fullName = removeWhiteSace(fullName)
  const nameParts = fullName.split(' ')
  const maxLength = 10 // set max length to 8 chars
  return maxLength >= 1
    ? nameParts
      .map((part, index) => index === 0 ? initCap(part) : index === 1 ? ` ${part.charAt(0).toUpperCase()}.` : '')
      .join('')
    : fullName
}

function getMaskedEmail (email) {
  return email.replace(/(?<=.{2}).(?=[^@]*.{1}@)/g, '*')
}
async function validateClub (req, res) {
  const club = await getClub(req.params.clubNumber)
  if (!club) {
    return generateResponse(
      res,
      httpStatusCode.UNPROCESSABLE_ENTITY,
      false,
      MSG_INVALID_CLUB
    )
  }
  return club
}

async function remoteFileToBuffer (url, sendBuffer = false) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    })

    const buffer = Buffer.from(response.data, 'binary')
    if (sendBuffer) {
      return buffer
    }
    const base64 = buffer.toString('base64')
    return base64
  } catch (error) {
    throw new Error('Error fetching file from remote URL')
  }
}

function isEmpty (obj) {
  return Object.keys(obj).length === 0
}

function isLeapYear (year = false) {
  if (!year) {
    year = moment().year()
  }
  // Using moment to check if the year is a leap year
  return moment(`${year}-02-29`, 'YYYY-MM-DD', true).isValid()
}
function getMembershipStatus (member, agreement, clubTime) {
  const membershipType = agreement.membership_type.toLowerCase()
  let status
  if (membershipType === 'basic') {
    status = TYPE_OF_MEMBER.BASIC
  } else if (membershipType === 'premium') {
    status = TYPE_OF_MEMBER.PREMIUM
  } else if (membershipType === 'more') {
    status = TYPE_OF_MEMBER.MORE
  } else if (membershipType === 'max') {
    status = TYPE_OF_MEMBER.MAX
  } else if (membershipType === 'employee') {
    status = TYPE_OF_MEMBER.MAX
  } else if (member.join_status === USER_TYPE_PROSPECT && agreement.expiration_date >= clubTime.format('YYYY-MM-DD')) {
    status = TYPE_OF_MEMBER.ACTIVE_7_DAY
  }
  return status
}

function isFollowingDST (zone) {
  let timeZone = 'EDT'
  switch (zone) {
    case 'PDT':
    case 'PST':
      timeZone = 'America/Los_angeles'
      break
    case 'EDT':
    case 'EST':
      timeZone = 'America/New_york'
      break
    case 'MDT':
    case 'MST':
      timeZone = 'America/Denver'
      break
    case 'AKST':
      timeZone = 'America/Anchorage'
      break
    case 'CDT':
      timeZone = 'America/Chicago'
      break
    default:
      timeZone = 'America/New_york'
      break
  }
  const now = moment().tz(timeZone)
  return now.isDST()
}
module.exports = {
  generateRandomString,
  isFollowingDST,
  generateResponse,
  formatRequestValidatorErrors,
  firebaseDynamicLinksGenerator,
  convertDateTimeToTZ,
  initCap
}
