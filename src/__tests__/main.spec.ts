import supertest from 'supertest';
import express from 'express';
import {createWriteStream} from 'fs';
import {unlink, stat, readdir} from 'fs/promises';

import {fileUploadMiddleware} from '../main';

describe('fileUploadMiddleware', () => {
  const inFilePath = __dirname + '/img.test.jpg';

  let app: express.Express;
  beforeEach(() => {
    app = express();
  });

  afterEach(async () => {
    await removeOutFiles()
  });

  const removeOutFiles = async () => {
    const OUT_FILE_MATCH = /.+\.out\..+$/;
    const files = await readdir(__dirname, {withFileTypes: true});
    await Promise.all(
      files
        .filter((file) => file.isFile() && OUT_FILE_MATCH.test(file.name))
        .map((file) => unlink(__dirname + '/' + file.name).catch(() => void 0))
    );
  }

  describe('all files', () => {
    const outFilePathPartial = __dirname + '/img.test.';
    beforeEach(() => {
      app.post(
        '/',
        fileUploadMiddleware((file) => {
          file.stream.pipe(createWriteStream(outFilePathPartial + file.fieldName + '.out.jpg'));
        }),
        (_, res) => res.end()
      );
    });

    test('test', async () => {
      await supertest(app)
        .post('/')
        .attach('file1', inFilePath)
        .attach('file2', inFilePath);

      const stats1 = await stat(outFilePathPartial + 'file1.out.jpg');
      expect(stats1.isFile()).toBe(true);

      const stats2 = await stat(outFilePathPartial + 'file2.out.jpg');
      expect(stats2.isFile()).toBe(true);
    });
  });

  describe('filter files', () => {
    const outFilePathPartial = __dirname + '/img.test.';
    beforeEach(() => {
      app.post(
        '/',
        fileUploadMiddleware((file) => {
          file.stream.pipe(createWriteStream(outFilePathPartial + file.fieldName + '.out.jpg'));
        }, {fields: ['file2']}),
        (_, res) => res.end()
      );
    });

    test('test', async () => {
      await supertest(app)
        .post('/')
        .attach('file1', inFilePath)
        .attach('file2', inFilePath);

      await expect(stat(outFilePathPartial + 'file1.out.jpg')).rejects.toThrow('ENOENT');

      const stats2 = await stat(outFilePathPartial + 'file2.out.jpg');
      expect(stats2.isFile()).toBe(true);
    });
  });
});
