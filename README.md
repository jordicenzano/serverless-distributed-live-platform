# serverless distributed live platform

This lambda uses an embedded `ffmpeg` to transcode chunks that are uploaded to S3, in combination with this tool [SSSS]() can create a distributed live transcoder


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
    - Use SRT client to stream to this server. Example: OBS for desktop, Larix for mobile