import Busboy from 'busboy';
import buildDebug from 'debug';
import type {RequestHandler} from 'express';

const debug = buildDebug('file-upload-middleware');

export const fileUploadMiddleware = (
  fileHandleCallback: FileHandleCallback,
  options?: FileUploadOptions
): RequestHandler => (req, _, next) => {
  let busboy: busboy.Busboy;
  try {
    busboy = new Busboy({
      headers: req.headers,
      limits: options?.limits
    });
  } catch (err) {
    next(err);
    return;
  }

  busboy.on('file', (fieldName, stream, fileName, encoding, mimetype) => {
    debug(`Found file ${fileName} in field ${fieldName} of type ${mimetype} and ${encoding} encoding`);

    if (Array.isArray(options?.fields) && !options?.fields?.includes(fieldName)) {
      debug(`Field (${fieldName}) does not match specified fields, ignoring`);
      stream.resume();
      return;
    }

    fileHandleCallback({
      fieldName,
      stream,
      fileName,
      encoding,
      mimetype
    });
  });

  busboy.on('filesLimit', () => {
    debug('Reached upload file limit');
  });

  busboy.on('partsLimit', () => {
    debug('Reached upload part limit');
  });

  busboy.once('finish', () => {
    debug('Completed upload parsing');
    next();
  });

  req.pipe(busboy);
};

export interface FileUploadOptions extends Partial<busboy.BusboyConfig> {
  fields?: string[];
}

export interface FilePart {
  fieldName: string;
  stream: NodeJS.ReadableStream;
  fileName: string;
  encoding: string;
  mimetype: string;
}

export type FileHandleCallback = (file: FilePart) => void;
