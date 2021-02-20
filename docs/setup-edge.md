# Set up Edge machine

- Start an EC2 machine
  - OS: Amazon Linux
  - Type: `t3.small` (or similar)
  - Instance Details: Default
  - Disc: SSD GP2 30GB
  - Security group
    - Inbound
      - 1935 0.0.0.0/0 TCP/UDP (SRT)
      - 22 0.0.0.0/0 TCP (SSH)
    - Outbound
      - ALL 0.0.0.0/0

- SSH into that machine:
```bash
  ssh -i yourKey.pem ec2-user@EC2-IP`
```

- (optional) Install [tmux](https://github.com/tmux/tmux/wiki)
```bash
sudo yum install -y tmux
```

- Install `ffmpeg` in EC2
```bash
sudo yum -y update
sudo yum -y install git
git clone https://github.com/jordicenzano/ffmpeg-compile-centos-amazon-linux.git
cd ffmpeg-compile-centos-amazon-linux
./compile-ffmpeg.sh
```

- Install go
```bash
sudo yum install -y golang
```

- Install & Compile `go-ts-segmenter`
```bash
cd ~
go get github.com/jordicenzano/go-ts-segmenter
cd go/src/github.com/jordicenzano/go-ts-segmenter
go get
make
```

Note: Next steps require to have en S3 bucket already configured. Strongly recommended use a bucket in the same region the EC2 machine is

- (Optional) From your laptop, upload some test media
```bash
scp -i ~/.ssh/KEY.pem test.mp4 ec2-user@IP:/home/ec2-user/test.mp4
```

- (Optional) Test with file
```bash
cd ~/go/src/github.com/jordicenzano/go-ts-segmenter/scripts
./transmuxed-file-to-s3.sh ~/test.mp4 S3BUCKET S3REGION
```

- (Optional) Test with srt
```bash
cd ~/go/src/github.com/jordicenzano/go-ts-segmenter/scripts
./transmuxed-srt-to-s3.sh live-dist-test us-east-1
```

- Use SRT client to stream to this server. Configure video codec = h264 and audio = AAC
  - Example: [OBS](https://obsproject.com/) for desktop or [Larix](https://softvelum.com/larix/) for mobile
  - To configure your encoder you need to use the public IP of your edge EC2 machine as destination and 1935 as port