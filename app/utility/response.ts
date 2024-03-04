const formatResponse = (statusCode: number, message: string, data: unknown) => {
  // error can also be the data
  if (data) {
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message,
        data,
      }),
    };
  } else {
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message,
      }),
    };
  }
};

export const SucessResponse = (data: object) => {
  return formatResponse(200, 'success', data);
};

export const ErrorResponse = (code = 1000, error: unknown) => {
  // if it is a array
  if (Array.isArray(error)) {
    const errorObject = error[0].constraints;
    const errorMesssage =
      errorObject[Object.keys(errorObject)[0]] || 'Error Occured';
    return formatResponse(code, errorMesssage, errorMesssage);
  }

  return formatResponse(code, `${error}`, error);
};
