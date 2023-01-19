import { Construct } from 'constructs';
import { aws_budgets as budgets } from 'aws-cdk-lib';
import {
  TimeUnit,
  Optional,
  Tag,
  NotificationType,
  ThresholdType,
  ComparisonOperator,
} from './utils';

export interface BudgetProps {
  tags?: Array<Tag>;
  limit: number;
  subscribers: Array<budgets.CfnBudget.SubscriberProperty>;
  alertContdition: BudgetAlertCondition;
}

export interface BudgetAlertCondition {
  period: TimeUnit,
  comparisonOperator?: ComparisonOperator,
  notificationType?: NotificationType.ACTUAL
  threshold: number,
  thresholdType?: ThresholdType,
}

type OptionalBudgetAlertCondition = Optional<BudgetAlertCondition>;
export interface OptionalBudgetProps {
  tags?: Array<Tag>;
  limit?: number;
  subscribers?: Array<budgets.CfnBudget.SubscriberProperty>;
  alertContdition?: OptionalBudgetAlertCondition;
}

export class Budget extends Construct {
  private readonly props: BudgetProps;
  private readonly scope: Construct;

  constructor(scope: Construct, id: string, props: BudgetProps) {
    super(scope, id)

    if (!Number.isInteger(props.limit) && props.limit > 0) {
      throw Error('budget limit must be a positive integer.')
    }

    new budgets.CfnBudget(this, `${id}_budget`, {
      budget: {
        budgetType: 'COST',
        budgetName: `${id}_budget`,
        timeUnit: props.alertContdition.period,
        budgetLimit: {
          amount: props.limit,
          unit: 'USD',
        },
        costFilters: this.createCostFilters(props),
      },
      notificationsWithSubscribers: [{
        notification: {
          comparisonOperator: props.alertContdition?.comparisonOperator ?? ComparisonOperator.GREATER_THAN,
          notificationType: props.alertContdition.notificationType ?? NotificationType.ACTUAL,
          threshold: props.alertContdition.threshold,
          thresholdType: props.alertContdition?.thresholdType ?? ThresholdType.PERCENTAGE,
        },
        subscribers: props.subscribers,
      }],
    })

    this.scope = scope;
    this.props = props;
  }

  private createCostFilters(props: BudgetProps) {
    const _tags: Array<string> = [];
    props.tags?.forEach((tag) => {
      _tags.push(`user:${tag.key}$` + tag.value);
    })

    const costFilters: any = {};

    if (_tags && _tags.length > 0) {
      costFilters.TagKeyValue = _tags;
    }

    return costFilters;
  }

  /**
   * create a copy of the object with the provided changes.
   * 
   * @param id - a unique CDK Construct identifier.
   * @param props - you can choose to optionally pass all the initializer parameters of this class as the changes you wish to have on the cloned object.
   * @returns - copy of the object
   */
  clone(id: string, props: OptionalBudgetProps): Budget {
    if (this.node.scope === undefined) {
      throw new Error('can not find scope of parent to make a clone.');
    }

    return new Budget(this.scope, id, {
      tags: props.tags ?? this.props.tags,
      limit: props.limit ?? this.props.limit,
      subscribers: props.subscribers ?? this.props.subscribers,
      alertContdition: {
        period: props.alertContdition?.period ?? this.props.alertContdition.period,
        comparisonOperator: props.alertContdition?.comparisonOperator ?? this.props.alertContdition.comparisonOperator,
        notificationType: props.alertContdition?.notificationType ?? this.props.alertContdition.notificationType,
        threshold: props.alertContdition?.threshold ?? this.props.alertContdition.threshold,
        thresholdType: props.alertContdition?.thresholdType ?? this.props.alertContdition.thresholdType,
      }
    });
  }
}


