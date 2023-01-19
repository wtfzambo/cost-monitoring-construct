import { AccountBudgetStrategy } from '../src';
import { App, Stack, StackProps, Tag, Tags } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AWSResourceType } from './resource-types';
import { Construct } from 'constructs';

class MockStack extends Stack {
    readonly budgetStrategy: AccountBudgetStrategy;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.budgetStrategy = new AccountBudgetStrategy(this, {
            monthlyBudgetInDollars: 100,
            defaultTopic: 'mocked-topic',
            subscribers: [
                'alert@example.com',
                'kiarash@kiani.info',
            ]
        });

        this.budgetStrategy.createAlerts();
    }
}

describe('An ApplicationBudgetStrategy', () => {
    let subject: Template;
    let budgetStrategy: AccountBudgetStrategy;

    beforeAll(() => {
        const mockApp = new App();
        const mockStack = new MockStack(mockApp, 'mocked-stack', {});

        budgetStrategy = mockStack.budgetStrategy;
        subject = Template.fromStack(mockStack);
    });

    it('should creates multiple aws budgets', () => {
        subject.resourceCountIs(AWSResourceType.Budget, 7);
    });

    it('should creates an sns topic', () => {
        subject.resourceCountIs(AWSResourceType.SNSTopic, 1);
    });

    it('should create daily budgets', () => {
        subject.hasResourceProperties(AWSResourceType.Budget, {
            "Budget": {
                "TimeUnit": "DAILY"
            },
        })
    });

    it('should create monthly budgets', () => {
        subject.hasResourceProperties(AWSResourceType.Budget, {
            "Budget": {
                "TimeUnit": "MONTHLY"
            },
        })
    });

    it('should calculates daily budget by rounding down monthly budget/30', () => {
        expect(budgetStrategy.dailyBudget).toEqual(3);
    });

    it('should calculates quarterly budget equal to six months', () => {
        expect(budgetStrategy.quarterlyBudget).toEqual(300);
    });

    it('should calculates yearly budget equal to 365 day', () => {
        expect(budgetStrategy.yearlyBudget).toEqual(1095);
    });
})
