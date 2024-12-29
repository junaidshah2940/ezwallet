import jwt, { decode } from 'jsonwebtoken'

/**
 * Handle possible date filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `date` parameter.
 *  The returned object must handle all possible combination of date filtering parameters, including the case where none are present.
 *  Example: {date: {$gte: "2023-04-30T00:00:00.000Z"}} returns all transactions whose `date` parameter indicates a date from 30/04/2023 (included) onwards
 * @throws an error if the query parameters include `date` together with at least one of `from` or `upTo`
 */
export const handleDateFilterParams = (req) =>{
  const {date, from, upTo} = req.query;
  const query = {};
  if(!date && !from && !upTo)
    return query;
  if((date && from) || (date && upTo))
    throw {message: "You cannot send date and " + (from ? (upTo? "from or ": "from ") : "") + (upTo ? "upTo" : "")};
  let startOfDay;
  let endOfDay;
  var regex = /^\d{4}-\d{2}-\d{2}$/;

  if(date) {
    if (!regex.test(date))
      throw {error: "Date is not a date in format YYYY-MM-DD"};
    if(!Date.parse(date))
      throw {error: "Date is not a date"};
  }
  if(from) {
    if (!regex.test(from))
      throw {error: "From is not a date in format YYYY-MM-DD"};
    if(!Date.parse(from))
      throw {error: "From is not a valid date"};
  }
  if(upTo) {
    if (!regex.test(upTo))
      throw {error: "UpTo is not a date in format YYYY-MM-DD"};
    if(!Date.parse(upTo))
      throw {error: "UpTo is not a valid date"};
  }
  if(date || from)
    startOfDay = new Date(`${date?date:from}T00:00:00.000Z`);
  if(date || upTo)
    endOfDay = new Date(`${date?date:upTo}T23:59:59.999Z`);
  query.date={};
  if(date)
    query.date = {$gte: startOfDay, $lte: endOfDay};
  if(from)
    query.date['$gte'] = startOfDay;
  if(upTo)
    query.date['$lte']= endOfDay;
  return query;
}

/**
 * Handle possible authentication modes depending on `authType`
 * @param req the request object that contains cookie information
 * @param res the result object of the request
 * @param info an object that specifies the `authType` and that contains additional information, depending on the value of `authType`
 *      Example: {authType: "Simple"}
 *      Additional criteria:
 *          - authType === "User":
 *              - either the accessToken or the refreshToken have a `username` different from the requested one => error 401
 *              - the accessToken is expired and the refreshToken has a `username` different from the requested one => error 401
 *              - both the accessToken and the refreshToken have a `username` equal to the requested one => success
 *              - the accessToken is expired and the refreshToken has a `username` equal to the requested one => success
 *          - authType === "Admin":
 *              - either the accessToken or the refreshToken have a `role` which is not Admin => error 401
 *              - the accessToken is expired and the refreshToken has a `role` which is not Admin => error 401
 *              - both the accessToken and the refreshToken have a `role` which is equal to Admin => success
 *              - the accessToken is expired and the refreshToken has a `role` which is equal to Admin => success
 *          - authType === "Group":
 *              - either the accessToken or the refreshToken have a `email` which is not in the requested group => error 401
 *              - the accessToken is expired and the refreshToken has a `email` which is not in the requested group => error 401
 *              - both the accessToken and the refreshToken have a `email` which is in the requested group => success
 *              - the accessToken is expired and the refreshToken has a `email` which is in the requested group => success
 * @returns true if the user satisfies all the conditions of the specified `authType` and false if at least one condition is not satisfied
 *  Refreshes the accessToken if it has expired and the refreshToken is still valid
 */
export const verifyAuth = (req, res, info) => {
  const cookie = req.cookies;
  if (!cookie.accessToken || !cookie.refreshToken) {
    // console.log("ciao")
    return { authorized: false, cause: "Unauthorized" };
  }
  try {
    const decodedAccessToken = jwt.verify(cookie.accessToken, process.env.ACCESS_KEY);
    const decodedRefreshToken = jwt.verify(cookie.refreshToken, process.env.ACCESS_KEY);
    if (!decodedAccessToken.username || !decodedAccessToken.email || !decodedAccessToken.role) {  // access token missing information
      return { authorized: false, cause: "Token is missing information" };
    }
    if (!decodedRefreshToken.username || !decodedRefreshToken.email || !decodedRefreshToken.role) {  // refresh token missing information
      return { authorized: false, cause: "Token is missing information" };
    }
    if (decodedAccessToken.username !== decodedRefreshToken.username || decodedAccessToken.email !== decodedRefreshToken.email || decodedAccessToken.role !== decodedRefreshToken.role) {  // mismatched users
      return { authorized: false, cause: "Mismatched users" };
    }
    if (info.authType === "Simple") {} else if (info.authType === "User") {
      if (decodedAccessToken.username !== info.username && decodedRefreshToken.username !== info.username) {
        return { authorized: false, cause: "Unauthorized" };
      }
    } else if (info.authType === "Admin") {
      if (decodedAccessToken.role !== "Admin" && decodedRefreshToken.role !== "Admin") {
        return { authorized: false, cause: "Unauthorized" };
      }
    } else if (info.authType === "Group") {
      if(!info.emails.includes(decodedAccessToken.email) && !info.emails.includes(decodedRefreshToken.email)){
        return { authorized: false, cause: "Unauthorized" }; 
      }
    } else {
      return { authorized: false, cause: "Invalid authType" };
    }
    return { authorized: true, cause: "Authorized" };
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      try {
        const refreshToken = jwt.verify(cookie.refreshToken, process.env.ACCESS_KEY);
        const newAccessToken = jwt.sign({
          username: refreshToken.username,
          email: refreshToken.email,
          id: refreshToken.id,
          role: refreshToken.role,
          groups: refreshToken.groups
        }, process.env.ACCESS_KEY, { expiresIn: '1h' });
        res.cookie('accessToken', newAccessToken, { httpOnly: true, path: '/api', maxAge: 60 * 60 * 1000, sameSite: 'none', secure: true });
        res.locals.refreshedTokenMessage = "mock message"
        req.cookies.accessToken = newAccessToken;
        return verifyAuth(req, res, info);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return { authorized: false, cause: "Perform login again" };
        } else {
          return { authorized: false, cause: err.name };
        }
      }
    } else {
      return { authorized: false, cause: err.name };
    }
  }
};
/**
 * Handle possible amount filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `amount` parameter.
 *  The returned object must handle all possible combination of amount filtering parameters, including the case where none are present.
 *  Example: {amount: {$gte: 100}} returns all transactions whose `amount` parameter is greater or equal than 100
 */
export const handleAmountFilterParams = (req) => {
  const query = {};
  if(req.query.min && req.query.max){
    if(isNaN(req.query.min) || isNaN(req.query.max))
      throw {error: "Invalid amount"};
    query.amount = { $gte: parseInt(req.query.min), $lte: parseInt(req.query.max) };
  }
  else if (req.query.min){
    if(isNaN(req.query.min))
      throw {error: "Invalid amount"};
    query.amount = { $gte: parseInt(req.query.min) };
  }
  else if (req.query.max){
    if(isNaN(req.query.max))
      throw {error: "Invalid amount"};
    query.amount = { $lte: parseInt(req.query.max) };
  }
  return query;
}