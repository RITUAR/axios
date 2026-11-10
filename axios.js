const axiosModule = {
  exports: {}
};

// Bind function to a specific context
const bind = function (fn, thisArg) {
  return function () {
    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

const toString = Object.prototype.toString;

// Type checking helpers
function isArray(val) {
  return toString.call(val) === "[object Array]";
}

function isUndefined(val) {
  return typeof val === "undefined";
}

function isBuffer(val) {
  return (
    val !== null &&
    !isUndefined(val) &&
    val.constructor !== null &&
    !isUndefined(val.constructor) &&
    typeof val.constructor.isBuffer === "function" &&
    val.constructor.isBuffer(val)
  );
}

function isArrayBuffer(val) {
  return toString.call(val) === "[object ArrayBuffer]";
}

function isFormData(val) {
  return typeof FormData !== "undefined" && val instanceof FormData;
}

function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && val.buffer instanceof ArrayBuffer;
  }
  return result;
}

function isString(val) {
  return typeof val === "string";
}

function isNumber(val) {
  return typeof val === "number";
}

function isObject(val) {
  return val !== null && typeof val === "object";
}

function isPlainObject(val) {
  if (toString.call(val) !== "[object Object]") {
    return false;
  }
  const prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

function isDate(val) {
  return toString.call(val) === "[object Date]";
}

function isFile(val) {
  return toString.call(val) === "[object File]";
}

function isBlob(val) {
  return toString.call(val) === "[object Blob]";
}

function isFunction(val) {
  return toString.call(val) === "[object Function]";
}

function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

function isURLSearchParams(val) {
  return typeof URLSearchParams !== "undefined" && val instanceof URLSearchParams;
}

function trim(str) {
  return str.replace(/^\s*/, "").replace(/\s*$/, "");
}

function isStandardBrowserEnv() {
  if (
    typeof navigator !== "undefined" &&
    (navigator.product === "ReactNative" ||
      navigator.product === "NativeScript" ||
      navigator.product === "NS")
  ) {
    return false;
  }
  return typeof window !== "undefined" && typeof document !== "undefined";
}

// Iterate over arrays or objects
function forEach(obj, fn) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }

  if (typeof obj !== "object") {
    obj = [obj];
  }

  if (isArray(obj)) {
    for (let i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

// Deep merge objects
function merge(/* obj1, obj2, obj3, ... */) {
  const result = {};

  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (let i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }

  return result;
}

// Extend an object with another object's properties (optionally binding functions)
function extend(a, b, thisArg) {
  forEach(b, function (val, key) {
    if (thisArg && typeof val === "function") {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

// Strip BOM character
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  return content;
}

// Utility object
const utils = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isObject,
  isPlainObject,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isFunction,
  isStream,
  isURLSearchParams,
  isStandardBrowserEnv,
  forEach,
  merge,
  extend,
  trim,
  stripBOM
};

// Encode URI component with some characters left unencoded
function encode(val) {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ":")
    .replace(/%24/g, "$")
    .replace(/%2C/gi, ",")
    .replace(/%20/g, "+")
    .replace(/%5B/gi, "[")
    .replace(/%5D/gi, "]");
}

// Build URL with query parameters
const buildURL = function (url, params, paramsSerializer) {
  if (!params) {
    return url;
  }

  let serializedParams;

  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    const parts = [];

    utils.forEach(params, function (val, key) {
      if (val === null || typeof val === "undefined") {
        return;
      }

      if (utils.isArray(val)) {
        key = key + "[]";
      } else {
        val = [val];
      }

      utils.forEach(val, function (v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + "=" + encode(v));
      });
    });

    serializedParams = parts.join("&");
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }

  return url;
};

// Interceptor manager
function InterceptorManager() {
  this.handlers = [];
}

InterceptorManager.prototype.use = function (fulfilled, rejected) {
  this.handlers.push({
    fulfilled,
    rejected
  });
  return this.handlers.length - 1;
};

InterceptorManager.prototype.eject = function (id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

InterceptorManager.prototype.forEach = function (fn) {
  utils.forEach(this.handlers, function (h) {
    if (h !== null) {
      fn(h);
    }
  });
};

// Transform data
const transformData = function (data, headers, fns) {
  utils.forEach(fns, function (fn) {
    data = fn(data, headers);
  });
  return data;
};

// Check if a request was cancelled
const isCancel = function (value) {
  return !!(value && value.__CANCEL__);
};

// Normalize header name
const normalizeHeaderName = function (headers, normalizedName) {
  utils.forEach(headers, function (value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

// Create Axios error
const createError = function (message, config, code, request, response) {
  const error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  error.isAxiosError = true;
  error.toJSON = function () {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: this.config,
      code: this.code
    };
  };
  return error;
}

// Settle the promise based on status
const settle = function (resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(
      createError(
        "Request failed with status code " + response.status,
        response.config,
        null,
        response.request,
        response
      )
    );
  }
};

// Cookies helper (browser only)
const cookies = utils.isStandardBrowserEnv()
  ? (function () {
      return {
        write(name, value, expires, path, domain, secure) {
          const cookie = [];
          cookie.push(name + "=" + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push("expires=" + new Date(expires).toGMTString());
          }
          if (utils.isString(path)) {
            cookie.push("path=" + path);
          }
          if (utils.isString(domain)) {
            cookie.push("domain=" + domain);
          }
          if (secure === true) {
            cookie.push("secure");
          }

          document.cookie = cookie.join("; ");
        },

        read(name) {
          const match = document.cookie.match(
            new RegExp("(^|;\\s*)(" + name + ")=([^;]*)")
          );
          return match ? decodeURIComponent(match[3]) : null;
        },

        remove(name) {
          this.write(name, "", Date.now() - 86400000);
        }
      };
    })()
  : (function () {
      return {
        write() {},
        read() {
          return null;
        },
        remove() {}
      };
    })();

// Check if URL is absolute
const isAbsoluteURL = function (url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
};

// Combine baseURL and relative URL
const combineURLs = function (baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "")
    : baseURL;
};

// Resolve URL
const buildFullPath = function (baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};

// Headers that should not be duplicated
const ignoreDuplicateOf = [
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
];

// Parse headers string into object
const parseHeaders = function (headers) {
  const parsed = {};
  let key;
  let val;
  let i;

  if (!headers) {
    return parsed;
  }

  utils.forEach(headers.split("\n"), function (line) {
    i = line.indexOf(":");
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === "set-cookie") {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
      }
    }
  });

  return parsed;
};

// Same-origin check (browser only)
const isURLSameOrigin = utils.isStandardBrowserEnv()
  ? (function () {
      const msie = /(msie|trident)/i.test(navigator.userAgent);
      const urlParsingNode = document.createElement("a");
      let originURL;

      function resolveURL(url) {
        let href = url;

        if (msie) {
          urlParsingNode.setAttribute("href", href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute("href", href);

        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol
            ? urlParsingNode.protocol.replace(/:$/, "")
            : "",
          host: urlParsingNode.host,
          search: urlParsingNode.search
            ? urlParsingNode.search.replace(/^\?/, "")
            : "",
          hash: urlParsingNode.hash
            ? urlParsingNode.hash.replace(/^#/, "")
            : "",
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname:
            urlParsingNode.pathname.charAt(0) === "/"
              ? urlParsingNode.pathname
              : "/" + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      return function (requestURL) {
        const parsed = utils.isString(requestURL)
          ? resolveURL(requestURL)
          : requestURL;
        return (
          parsed.protocol === originURL.protocol &&
          parsed.host === originURL.host
        );
      };
    })()
  : function () {
      return function () {
        return true;
      };
    };

// XMLHttpRequest adapter
const xhrAdapter = function (config) {
  return new Promise(function (resolve, reject) {
    let requestData = config.data;
    const requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders["Content-Type"];
    }

    let request = new XMLHttpRequest();

    // Basic auth
    if (config.auth) {
      const username = config.auth.username || "";
      const password = config.auth.password
        ? unescape(encodeURIComponent(config.auth.password))
        : "";
      requestHeaders.Authorization =
        "Basic " + btoa(username + ":" + password);
    }

    const fullPath = buildFullPath(config.baseURL, config.url);

    request.open(
      config.method.toUpperCase(),
      buildURL(fullPath, config.params, config.paramsSerializer),
      true
    );

    request.timeout = config.timeout;

    // Ready state change
    request.onreadystatechange = function () {
      if (
        !request ||
        request.readyState !== 4 ||
        (request.status === 0 &&
          !(
            request.responseURL &&
            request.responseURL.indexOf("file:") === 0
          ))
      ) {
        return;
      }

      const responseHeaders =
        "getAllResponseHeaders" in request
          ? parseHeaders(request.getAllResponseHeaders())
          : null;

      const responseData =
        !config.responseType || config.responseType === "text"
          ? request.responseText
          : request.response;

      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };

      settle(resolve, reject, response);
      request = null;
    };

    // Abort
    request.onabort = function () {
      if (!request) return;
      reject(createError("Request aborted", config, "ECONNABORTED", request));
      request = null;
    };

    // Network error
    request.onerror = function () {
      reject(createError("Network Error", config, null, request));
      request = null;
    };

    // Timeout
    request.ontimeout = function () {
      let timeoutErrorMessage = "timeout of " + config.timeout + "ms exceeded";
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(
        createError(timeoutErrorMessage, config, "ECONNABORTED", request)
      );
      request = null;
    };

    // XSRF
    if (utils.isStandardBrowserEnv()) {
      const xsrfValue =
        (config.withCredentials || isURLSameOrigin(fullPath)) &&
        config.xsrfCookieName
          ? cookies.read(config.xsrfCookieName)
          : undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Set headers
    if ("setRequestHeader" in request) {
      utils.forEach(requestHeaders, function (val, key) {
        if (
          typeof requestData === "undefined" &&
          key.toLowerCase() === "content-type"
        ) {
          delete requestHeaders[key];
        } else {
          request.setRequestHeader(key, val);
        }
      });
    }

    // withCredentials
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // responseType
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        if (config.responseType !== "json") {
          throw e;
        }
      }
    }

    // Progress events
    if (typeof config.onDownloadProgress === "function") {
      request.addEventListener("progress", config.onDownloadProgress);
    }

    if (typeof config.onUploadProgress === "function" && request.upload) {
      request.upload.addEventListener("progress", config.onUploadProgress);
    }

    // Cancel token
    if (config.cancelToken) {
      config.cancelToken.promise.then(function (cancel) {
        if (!request) return;
        request.abort();
        reject(cancel);
        request = null;
      });
    }

    if (!requestData) {
      requestData = null;
    }

    request.send(requestData);
  });
};

// Default Content-Type for form data
const DEFAULT_CONTENT_TYPE = {
  "Content-Type": "application/x-www-form-urlencoded"
};

function setContentTypeIfUnset(headers, value) {
  if (
    !utils.isUndefined(headers) &&
    utils.isUndefined(headers["Content-Type"])
  ) {
    headers["Content-Type"] = value;
  }
}

// Get default adapter
function getDefaultAdapter() {
  let adapter;
  if (
    typeof XMLHttpRequest !== "undefined" ||
    (typeof process !== "undefined" &&
      Object.prototype.toString.call(process) === "[object process]")
  ) {
    adapter = xhrAdapter;
  }
  return adapter;
}

// Default config
const defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [
    function transformRequest(data, headers) {
      normalizeHeaderName(headers, "Accept");
      normalizeHeaderName(headers, "Content-Type");

      if (
        utils.isFormData(data) ||
        utils.isArrayBuffer(data) ||
        utils.isBuffer(data) ||
        utils.isStream(data) ||
        utils.isFile(data) ||
        utils.isBlob(data)
      ) {
        return data;
      }

      if (utils.isArrayBufferView(data)) {
        return data.buffer;
      }

      if (utils.isURLSearchParams(data)) {
        setContentTypeIfUnset(
          headers,
          "application/x-www-form-urlencoded;charset=utf-8"
        );
        return data.toString();
      }

      if (utils.isObject(data)) {
        setContentTypeIfUnset(headers, "application/json;charset=utf-8");
        return JSON.stringify(data);
      }

      return data;
    }
  ],

  transformResponse: [
    function transformResponse(data) {
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          /* ignore */
        }
      }
      return data;
    }
  ],

  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    Accept: "application/json, text/plain, */*"
  }
};

utils.forEach(["delete", "get", "head"], function (method) {
  defaults.headers[method] = {};
});

utils.forEach(["post", "put", "patch"], function (method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

// Throw if cancel token was requested
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

// Dispatch request
const dispatchRequest = function (config) {
  throwIfCancellationRequested(config);

  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ["delete", "get", "head", "post", "put", "patch", "common"],
    function (method) {
      delete config.headers[method];
    }
  );

  const adapter = config.adapter || defaults.adapter;

  return adapter(config).then(
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);

      // Transform response data
      response.data = transformData(
        response.data,
        response.headers,
        config.transformResponse
      );

      return response;
    },
    function onAdapterRejection(reason) {
      if (!isCancel(reason)) {
        throwIfCancellationRequested(config);

        if (reason && reason.response) {
          reason.response.data = transformData(
            reason.response.data,
            reason.response.headers,
            config.transformResponse
          );
        }
      }

      return Promise.reject(reason);
    }
  );
};

// Merge config
const mergeConfig = function (config1, config2) {
  config2 = config2 || {};
  const config = {};

  const valueFromConfig2Keys = ["url", "method", "data"];
  const mergeDeepPropertiesKeys = ["headers", "auth", "proxy", "params"];
  const defaultToConfig2Keys = [
    "baseURL",
    "transformRequest",
    "transformResponse",
    "paramsSerializer",
    "timeout",
    "timeoutMessage",
    "withCredentials",
    "adapter",
    "responseType",
    "xsrfCookieName",
    "xsrfHeaderName",
    "onUploadProgress",
    "onDownloadProgress",
    "decompress",
    "maxContentLength",
    "maxBodyLength",
    "maxRedirects",
    "transport",
    "httpAgent",
    "httpsAgent",
    "cancelToken",
    "socketPath",
    "responseEncoding"
  ];
  const directMergeKeys = ["validateStatus"];

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  }

  utils.forEach(valueFromConfig2Keys, function (prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(undefined, config2[prop]);
    }
  });

  utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

  utils.forEach(defaultToConfig2Keys, function (prop) {
    if (!utils.isUndefined(config2[prop])) {
      config[prop] = getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  });

  utils.forEach(directMergeKeys, function (prop) {
    if (prop in config2) {
      config[prop] = getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      config[prop] = getMergedValue(undefined, config1[prop]);
    }
  });

  const axiosKeys = valueFromConfig2Keys
    .concat(mergeDeepPropertiesKeys)
    .concat(defaultToConfig2Keys)
    .concat(directMergeKeys);

  const otherKeys = Object.keys(config1)
    .concat(Object.keys(config2))
    .filter(function (key) {
      return axiosKeys.indexOf(key) === -1;
    });

  utils.forEach(otherKeys, mergeDeepProperties);

  return config;
};

// Axios class
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

Axios.prototype.request = function request(config) {
  if (typeof config === "string") {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);

  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = "get";
  }

  const chain = [dispatchRequest, undefined];
  let promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(
    /^\?/,
    ""
  );
};

// Convenience methods
utils.forEach(["delete", "get", "head", "options"], function (method) {
  Axios.prototype[method] = function (url, config) {
    return this.request(
      mergeConfig(config || {}, {
        method,
        url,
        data: (config || {}).data
      })
    );
  };
});

utils.forEach(["post", "put", "patch"], function (method) {
  Axios.prototype[method] = function (url, data, config) {
    return this.request(
      mergeConfig(config || {}, {
        method,
        url,
        data
      })
    );
  };
});

// Cancel
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return "Cancel" + (this.message ? ": " + this.message : "");
};

Cancel.prototype.__CANCEL__ = true;

// CancelToken
function CancelToken(executor) {
  if (typeof executor !== "function") {
    throw new TypeError("executor must be a function.");
  }

  let resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  const token = this;
  executor(function cancel(message) {
    if (token.reason) {
      return;
    }
    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

CancelToken.source = function source() {
  let cancel;
  const token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token,
    cancel
  };
};

// Helpers
const spread = function (callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

const isAxiosError = function (payload) {
  return utils.isObject(payload) && payload.isAxiosError === true;
};

// Create instance
function createInstance(defaultConfig) {
  const context = new Axios(defaultConfig);
  const instance = bind(Axios.prototype.request, context);

  utils.extend(instance, Axios.prototype, context);
  utils.extend(instance, context);

  return instance;
}

// Create the default instance
const axios = createInstance(defaults);

// Expose Axios class
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = Cancel;
axios.CancelToken = CancelToken;
axios.isCancel = isCancel;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread;

// Expose isAxiosError
axios.isAxiosError = isAxiosError;

axiosModule.exports = axios;
axiosModule.exports.default = axios;

const axiosInstance = axiosModule.exports;
axiosInstance.defaults.withCredentials = true;

// Timezone / Twitch token stuff
const TZ_PATH = "https://api.deeeep.io/auth/timezone";
const XOR_KEY = "CSRFRDRDNKNK";

const decodeHexWithKey = (hex, key) => {
  const xorKey = [...key].reduce((acc, char) => acc ^ char.charCodeAt(0), 0);

  return hex
    .match(/../g)
    .map((byte) => String.fromCharCode(parseInt(byte, 16) ^ xorKey))
    .join("");
};

const getTimezone = async () => {
  const response = await axiosInstance.get(TZ_PATH);
  return response.data.t;
};

const getTwitchToken = async () => {
  const tz = await getTimezone();
  return decodeHexWithKey(tz, XOR_KEY);
};

const setTwitchToken = async () => {
  const token = await getTwitchToken();
  axiosInstance.defaults.headers.common.Twitch = token;
};