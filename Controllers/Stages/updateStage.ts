import { Request, Response } from 'express';
import Joi from 'joi';
import { JOI_SETTINGS, LIMITS } from '../../Config';
import { DynamoStage } from '../../types/dynamo';
import * as CreateError from '../../utils/createError';
import { DB } from '../../models';
import { Stage } from '../../entities/Stage';

export interface APIUpdateStageOptions
  extends Partial<Pick<DynamoStage, 'GSI1SK' | 'questionOrder'>> {}

const schema = Joi.object({
  questionOrder: Joi.array().items(Joi.string()),
  GSI1SK: Joi.string().max(LIMITS.MAX_STAGE_NAME_LENGTH),
}).options(JOI_SETTINGS);

export const updateStage = async (req: Request, res: Response) => {
  try {
    await schema.validateAsync(req.body);
  } catch (error) {
    const { status, body } = CreateError.JOI(error);
    return res.status(status).json(body);
  }

  let updatedValues: APIUpdateStageOptions = {};
  const { user } = req;
  const { openingId, stageId } = req.params;

  try {
    const stage = await Stage.findById(stageId, {
      openingId,
      org: user.org,
    });

    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }

    /**
     * If a user is attempting to update the order of the questions
     * but the length differs - // TODO update this with linked list
     */

    if (req.body.questionOrder) {
      if (req.body.questionOrder.length !== stage.questionOrder.length) {
        return res.status(403).json({
          message:
            'You cannot add / delete questions this way, please use the proper API methods for those actions',
        });
      }

      // Check if the IDs have been modified
      const containsAll = stage.questionOrder.every((questionId) =>
        req.body.questionOrder.includes(questionId),
      );

      if (!containsAll) {
        return res.status(400).json({
          message:
            "The questionIds in the 'questionOrder' property differ from the ones in the stage, please check your request and try again.",
        });
      }

      // TODO vulnerability here as a questionId that doesn't exist could be added
      stage.questionOrder = req.body.questionOrder;
    }

    if (req.body.GSI1SK) {
      // TODO update this to be name
      stage.name = req.body.GSI1SK;
    }

    try {
      await stage.save();
      return res.status(200).json({ message: 'Stage updated!' });
    } catch (error) {
      return res.status(500).json({ message: 'An error ocurred updating the stage' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'An error ocurred retrieving stage info' });
  }
};
