## Set permissions to local AWS CLI user
You should allow your local AWS CLI user to perform some actions on your AWS resources, since this user will be creating / updating those resources

![Local user needed policies](/docs/pics/grant-local-user-IAM-access.png)

*Note: I recommend remove some of those policies after the initial set up (specially IAM full access policy). This is just an easy and unsafe way to avoid a permissions hassle*
