import * as bodyparser from 'body-parser';
import { exec } from 'child_process';
import { Request, Response, Router } from 'express';
import * as multer from 'multer';
import * as path from 'path';
import * as webpackConfig from './../webpack.config';
import { config as serverConfig } from './config';
import { getFileList, statAsync } from './utils';

const urlencodedParser = bodyparser.urlencoded({ extended: true });
const isProduction = process.env.NODE_ENV === 'production';
const outputFile = webpackConfig.output.filename;
export const router = Router();
const storage = multer.diskStorage({
    destination: (request,  file, callback) => {
        callback(null, serverConfig.uploads);
    },
    filename: (request, file, callback) => {
        let filename = file.originalname;
        if (file.mimetype.match('video/.*')) {
            filename = `${filename}.mp4`;
        }
        console.info(`UPLOADING FILE... ${filename}`);
        callback(null, filename);
    },
});
const upload = multer({ storage });

// Routes
router.get('/', (req: Request, res: Response) => {
    res.render('index', {
        bundle: (isProduction ? '/' : 'http://localhost:8080/') + outputFile,
        title: 'PiZilla',
    });
});

router.post('/upload', upload.any(), (req: Request, res: Response) => {
    return res.status( 200 ).send(req.files);
});

router.get('/files', async (req: Request, res: Response) => {
    let curDir = serverConfig.uploads;
    const query = req.query.path || '';
    if (query) { curDir = path.resolve(query); }
    const files = await getFileList(curDir);
    if (files === null) {
        res.json({ error: `Access denied: ${curDir}` }).end(403);
    } else {
        res.json(files);
    }
});

router.get('/pifire', (_: Request, res: Response) => {
    res.render('pifire');
});

router.post('/pifire', urlencodedParser, (req: Request, res: Response) => {
    const response = {
        selection_radio: req.body.group1,
        url_input: req.body.url,
    };
    const url = response.url_input;
    const file = '/home/vinay/Desktop/PiZilla/uploads/';
    let type = '';

    if (response.selection_radio === 'music') {
        type = '-f 140';
    }

    exec(`youtube-dl ${type} --no-check-certificate ` +
         '-c --audio-quality 0 --restrict-filenames --no-warnings ' +
         `--no-check-certificate -o ${file}'%(title)s.%(ext)s' ` +
         `"${url}"`, (error) => {
             if (error) {
                 console.error(error);
             } else {
                 exec(`youtube-dl ${type} --no-check-certificate ` +
                     '-c --recode-video mp4 --restrict-filenames' +
                     ` --no-warnings -o ${file}'%(title)s.%(ext)s' "${url}"`,
                     (err) => { if (err) { console.error(err); } });
             }
    });

    res.redirect('/pifire');
});