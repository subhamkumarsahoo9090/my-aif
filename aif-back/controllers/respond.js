export function respond(res, result) {
  if (!result.ok) {
    res.status(result.status).json({ message: result.message });
    return;
  }
  res.status(result.status).json(result.data);
}

export function controller(action) {
  return async (req, res, next) => {
    try {
      respond(res, await action(req));
    } catch (error) {
      next(error);
    }
  };
}
