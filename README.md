# Serverless distributed live platform

This system allows you to stream SRT (h264 + AAC) and create the live ABR in a fully distributed way.

**Disclaimer: This is just a proof of concept, it is not ready / designed to run in production environments**

## Introduction

TODO

## How

TODO: Block diagram

We have a small server at the edge that terminates the [SRT protocol](TODO) and transmuxes the media to [Transport Stream (TS)](TODO), all of these is done with a simple [ffmpeg](TODO) command. 

In the same server the resulting TS is divided in chunks (individually playable) using this open source project [go-ts-segmenter](TODO), and those chunks are uploaded to [S3](TODO). When the upload of each chunk finishes S3 automatically invokes a [Lambda](TODO) function that reads the current config for that stream from [DynamoDB](TODO) and creates the ABR lanes defined in the previous configuration. 
Finally those transcoded chunks are saved again to S3 and [DynamoDB] updated with the ABR chunks information.

To allow the playback of that live stream we implemented a "minimalist" manifest service inside a Lambda that creates an HLS manifest on the fly based on the info in [DynamoDB](TODO). 

To protect that playback we added a CDN on top of S3 to serve the chunks, and we activated the cache on API GTW to serve the manifests.


TODO

This lambda uses an embedded `ffmpeg` to transcode chunks that are uploaded to S3, in combination with this tool [SSSS]() can create a distributed live transcoder

# Challenges
- S3 no real time
- Rate encodere
- Audio priming

# Set up the environment
This script will do it for you assuming you have [AWS CLI] installed and configured properly in your system

```
set-up-aws.sh
```


Edge

- Install `ffmpeg` in EC2
```
sudo yum -y install git
git clone https://github.com/jordicenzano/ffmpeg-compile-centos-amazon-linux.git
cd ffmpeg-compile-centos-amazon-linux
./compile-ffmpeg.sh
```

- Install [tmux](TODO) (always useful)
```
sudo yum install -y tmux
```

- Install go
```
sudo yum install -y golang
```

- Install & Compile `go-ts-segmenter`
```
cd ~
go get github.com/jordicenzano/go-ts-segmenter
cd go/src/github.com/jordicenzano/go-ts-segmenter
go get

```

- Upload some test media (optional)
```
scp -i ~/.ssh/KEY.pem test.mp4 ec2-user@IP:/home/ec2-user/test.mp4
```

- Test with internal file
```
./transmuxed-file-to-s3.sh ~/media/test.mp4 S3BUCKET S3REGION
```

- Test with srt
```
./transmuxed-srt-to-s3.sh live-dist-test us-east-1
```
- Use SRT client to stream to this server. Configure video codec = h264 and audio = AAC
  - Example: OBS for desktop, Larix for mobile


# TODO
- Create a cloudformation template for AWS infrastructure