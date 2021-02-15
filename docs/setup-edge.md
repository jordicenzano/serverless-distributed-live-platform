# Set up Edge machine

- Start an EC2 machine
  - Type: XXX
  - Disc
  - Security group

- SSH into that machine

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

Note: Next steps require to have en S3 bucket already configured. Strongly recommended use a bucket in the same region the EC2 machine is

  - (Optional) Upload some test media
```
scp -i ~/.ssh/KEY.pem test.mp4 ec2-user@IP:/home/ec2-user/test.mp4
```

  - (Optional) Upload to S3 test with internal file
```
./transmuxed-file-to-s3.sh ~/media/test.mp4 S3BUCKET S3REGION
```

  - (Optional) Test with srt
```
./transmuxed-srt-to-s3.sh live-dist-test us-east-1
```
- Use SRT client to stream to this server. Configure video codec = h264 and audio = AAC
  - Example: [OBS](https://obsproject.com/) for desktop or [Larix](https://softvelum.com/larix/) for mobile
