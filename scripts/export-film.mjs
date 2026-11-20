import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { frameCount } from '../src/lib/film-timeline.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/export-film.mjs path/to/approved-clip.mp4');
const movie = resolve(input);
const duration = Number(execFileSync('ffprobe', [
  '-v','error','-show_entries','format=duration','-of','csv=p=0',movie
],{encoding:'utf8'}).trim());
if (!(duration>0 && Number.isFinite(duration))) throw new Error('The clip needs a finite, positive duration.');

const stage = await mkdtemp(join(tmpdir(),'ttw-film-'));
try {
  const filter = 'fps='+frameCount+'/'+duration+',scale=1120:630:force_original_aspect_ratio=increase,crop=1120:630,setsar=1,tpad=stop_mode=clone:stop_duration=1';
  execFileSync('ffmpeg',['-v','error','-i',movie,'-an','-vf',filter,'-frames:v',String(frameCount),
    '-c:v','libwebp','-quality','80','-start_number','0',join(stage,'frame-%03d.webp')]);
  const frames = (await readdir(stage)).filter(name=>/^frame-\d{3}\.webp$/.test(name)).sort();
  if (frames.length!==frameCount) throw new Error('The clip did not produce the expected frame sequence.');
  execFileSync('ffmpeg',['-v','error','-i',movie,'-an','-frames:v','1',join(stage,'poster.png')]);
  await sharp(join(stage,'poster.png')).resize(1760,990,{fit:'cover'}).webp({quality:87}).toFile(join(stage,'workbench-1760.webp'));
  await sharp(join(stage,'poster.png')).resize(880,990,{fit:'cover'}).webp({quality:83}).toFile(join(stage,'workbench-880.webp'));
  await sharp(join(stage,frames.at(-1))).webp({quality:85}).toFile(join(stage,'workbench-close.webp'));
  await mkdir('public/story',{recursive:true});
  await mkdir('public/images',{recursive:true});
  for (const name of frames) await copyFile(join(stage,name),join('public/story',name));
  for (const name of ['workbench-1760.webp','workbench-880.webp','workbench-close.webp']) {
    await copyFile(join(stage,name),join('public/images',name));
  }
  // Screen coordinates are specific to the old shot. The lead card works
  // independently until the approved shot has its own measured corners.
  await writeFile('src/lib/bench-track.json','{"screen":[],"objects":[]}\n');
  console.log('Exported '+frameCount+' story frames and the opening, mobile and closing stills.');
} finally {
  await rm(stage,{recursive:true,force:true});
}
