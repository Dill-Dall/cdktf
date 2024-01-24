import { Construct } from "constructs";
import { App, TerraformStack,S3Backend } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SnsTopicSubscription  } from "@cdktf/provider-aws/lib/sns-topic-subscription";
import { SnsTopic } from "@cdktf/provider-aws/lib/sns-topic";
import { SqsQueue } from "@cdktf/provider-aws/lib/sqs-queue";
import { SqsQueuePolicy } from "@cdktf/provider-aws/lib/sqs-queue-policy";

function createSqsPolicyConfig(construct: Construct, config: {queueUrl: string, queueArn : string, topicArn: string}): SqsQueuePolicy {
  return new SqsQueuePolicy(construct, "user_updates_queue_policy", {
    queueUrl: config.queueUrl,
    policy: JSON.stringify({
      Version: "2012-10-17",
      Id: `${config.queueUrl}-Policy`,
      Statement: [
        {
          Sid: "Allow-SNS-SendMessage",
          Effect: "Allow",
          Principal: {
            Service: "sns.amazonaws.com"
          },
          Action: "sqs:SendMessage",
          Resource: config.queueArn,
          Condition: {
            ArnEquals: {
              "aws:SourceArn": config.topicArn
            }
          }
        }
      ]
    })
  });
}

class StreamStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: {env:string}) {
    super(scope, id);
      new AwsProvider(this, "AWS",{
        region: "eu-north-1"
      });
      new S3Backend(this, {
        bucket: "cdktf-690090428495",
        key:`testing/${config.env}}`,
        region: "eu-north-1"
      });

      const userUpdates = new SnsTopic(this, "user_updates", {
        name: `user-updates-topic-${config.env}`,
      });
      const userUpdatesQueue = new SqsQueue(this, "user_updates_queue", {
        name: `user-updates-queue-${config.env}`,
      });
      new SnsTopicSubscription(this, "user_updates_sqs_target", {
        endpoint: userUpdatesQueue.arn,
        protocol: "sqs",
        topicArn: userUpdates.arn,
      });

      createSqsPolicyConfig(this, {
        queueUrl: userUpdatesQueue.url,
        queueArn: userUpdatesQueue.arn,
        topicArn: userUpdates.arn
      });


    }
  }
  
const app = new App();
new StreamStack(app, "thestream-dev", {env:"dev"});
new StreamStack(app, "thestream-stg", {env:"stg"});
app.synth();
