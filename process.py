import sys, json, os, base64, subprocess, time, click
import cv2

def playVideo(path):
    video = cv2.VideoCapture(path);
    videoFramerate = int(video.get(cv2.CAP_PROP_FPS));

    while (video.isOpened()):
        ret, frame = video.read();

        if (not ret):
            break;

        cv2.imshow('frame', frame);

        if (cv2.waitKey(25) == ord('q')):
            break;

        time.sleep(1 / videoFramerate);
    
    video.release();
    cv2.destroyAllWindows();

@click.command()
@click.option('--framerate', default=20, help='The number of frames per second to process the images at')
@click.option('--images', default='./images', help='The path containing the input images')
@click.option('--output', default='./output', help='The path containing the output video')
@click.option('--autoplay', default=True, help='Whether to autoplay the video after processing')
def process(framerate, images, output, autoplay):
    if (not os.path.exists(output)):
        os.makedirs(output);

    fileTime = time.strftime("%H:%M:%S");
    outputPath = f'{str(output)}/{fileTime}.mp4';

    subprocess.run([
        'ffmpeg', 

        '-framerate', str(framerate), 

        '-pattern_type', 'glob', 
        '-i', f'{str(images)}/*.png', 

        '-c:v', 'libx264', 
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', 
        outputPath
    ]);

    if (autoplay):
        playVideo(outputPath);

if (__name__ == '__main__'):
    process();