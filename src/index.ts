import axios from 'axios'
import express from 'express'

const app = express()
const port = 3000

//hardcode event service cluster locations for now (move to DB in future)
const eventServiceLocations = {
    "purple": [
        "us-east-1",
        "us-west-2"
    ],
    "grey": "eu-west-2",
    "orange": "eu-west-2",
    "yellow": [
        "us-east-1",
        "us-west-2"
    ]
}

const locationsMap = {
    "us-east-1": "N.Virginia",
    "us-west-2": "Oregon",
    "eu-west-2": "London"
}

const webhookURL = 'https://hooks.slack.com/services/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'

function getPlatformData(deployment: string) {
    const platformURL = 'https://teooh.evnt.'+deployment+'/admin/Controller_Alive'
    return axios.get(platformURL)
}

function sendSlackMessage(webhookURL: string, messageBody) {
    try {
        messageBody = JSON.stringify(messageBody)
    } catch (e) {
        throw new Error('Failed to stringify messageBody' + e)
    }
    return axios.post(webhookURL, messageBody)
}

async function processDeployment() {
    if(!webhookURL) {
        console.error('Please fill in your Webhook URL')
    }

    console.log('Sending slack message')
    try {
        await getPlatformData('build')
        .then((response) => {
            let serviceFields = [
                {
                    "type": "mrkdwn",
                    "text": "_Platform:_ "
                },
                {
                    "type": "mrkdwn",
                    "text": "_Logs:_ "
                }
            ]
            
            let slackPayload = {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": ":fire: *Updated Deployment* :fire:"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": "_Environment:_ "
                            },
                            {
                                "type": "mrkdwn",
                                "text": "_Version:_ "
                            }
                        ]
                    },
                    {
                        "type": "section",
                        "fields": serviceFields
                    }
                ]
            }
            slackPayload.blocks[1].fields[0].text += "*"+response.data.ENVIRONMENT+"*"
            slackPayload.blocks[1].fields[1].text += "*"+response.data.PLATFORM_VERSION+"*"
            slackPayload.blocks[2].fields[0].text += "*<https://eu-west-2.console.aws.amazon.com/ec2autoscaling/home?region=eu-west-2#/details/pl_asg_"+response.data.ENVIRONMENT+"_"+response.data.DEPLOYMENT+"|"+response.data.DEPLOYMENT+">*"
            slackPayload.blocks[2].fields[1].text += "*<https://eu-west-2.console.aws.amazon.com/cloudwatch/home?region=eu-west-2#logsV2:log-groups/log-group/$252Fteooh$252Fplatform$252F"+response.data.ENVIRONMENT+"$252F"+response.data.DEPLOYMENT+"|Cloudwatch Logs>*"

            const awsRegionObject = eventServiceLocations[response.data.EVENT_SERVICE]
            if(Array.isArray(awsRegionObject)) {
                awsRegionObject.forEach(element => {
                    const readableLocation = locationsMap[element]
                    const clusterElement = {
                        "type": "mrkdwn",
                        "text": "_Event Service ("+readableLocation+"):_ *<https://"+element+".console.aws.amazon.com/ecs/home?region="+element+"#/clusters/event-service-"+response.data.EVENT_SERVICE+"-cls/tasks|"+response.data.EVENT_SERVICE+">*"
                    }
                    serviceFields.push(clusterElement)
                })
            } else {
                const readableLocation = locationsMap[awsRegionObject]
                const clusterElement = {
                    "type": "mrkdwn",
                    "text": "_Event Service ("+readableLocation+"):_ *<https://"+awsRegionObject+".console.aws.amazon.com/ecs/home?region="+awsRegionObject+"#/clusters/event-service-"+response.data.EVENT_SERVICE+"-cls/tasks|"+response.data.EVENT_SERVICE+">*"
                }
                serviceFields.push(clusterElement)
            }
            return axios.post(webhookURL, slackPayload)
        })
        .catch((e) => {
            console.error('There was an error', e)
        })
    } catch (e) {
        console.error('There was an error with the request', e)
    }
}

app.get('/', (req, res) => {
    processDeployment()
    res.sendStatus(200)
})

app.listen(port, () => {
    console.log(`Example app running on http://localhost:${port}`)
})