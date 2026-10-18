const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

// Runs after the validation rules; stops the request if any rule failed
function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result
      .array({ onlyFirstError: true })
      .map((e) => ({ field: e.path, message: e.msg }));
    return fail(res, 422, 'Data yang dikirim tidak valid', errors);
  }
  next();
}

module.exports = validate;