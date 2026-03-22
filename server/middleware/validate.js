export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    req.body = value;
    next();
  };
}

export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '');
}
