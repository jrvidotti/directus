import express from 'express';
import asyncHandler from '../utils/async-handler';
import { FoldersService, MetaService } from '../services';
import { ForbiddenException, InvalidPayloadException, FailedValidationException } from '../exceptions';
import useCollection from '../middleware/use-collection';
import { respond } from '../middleware/respond';
import { PrimaryKey } from '../types';
import Joi from 'joi';
import { validateBatch } from '../middleware/validate-batch';

const router = express.Router();

router.use(useCollection('directus_folders'));

router.post(
	'/',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const savedKeys: PrimaryKey[] = [];

		if (Array.isArray(req.body)) {
			const keys = await service.createMany(req.body);
			savedKeys.push(...keys);
		} else {
			const primaryKey = await service.createOne(req.body);
			savedKeys.push(primaryKey);
		}

		try {
			if (Array.isArray(req.body)) {
				const records = await service.readMany(savedKeys, req.sanitizedQuery);
				res.locals.payload = { data: records };
			} else {
				const record = await service.readOne(savedKeys[0], req.sanitizedQuery);
				res.locals.payload = { data: record };
			}
		} catch (error) {
			if (error instanceof ForbiddenException) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond
);

router.get(
	'/',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({
			accountability: req.accountability,
			schema: req.schema,
		});
		const metaService = new MetaService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const records = await service.readByQuery(req.sanitizedQuery);
		const meta = await metaService.getMetaForQuery('directus_files', req.sanitizedQuery);

		res.locals.payload = { data: records || null, meta };
		return next();
	}),
	respond
);

router.get(
	'/:pk',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({
			accountability: req.accountability,
			schema: req.schema,
		});
		const record = await service.readOne(req.params.pk, req.sanitizedQuery);

		res.locals.payload = { data: record || null };
		return next();
	}),
	respond
);

router.patch(
	'/:collection',
	validateBatch('update'),
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({
			accountability: req.accountability,
			schema: req.schema,
		});

		let keys: PrimaryKey[] = [];

		if (req.body.keys) {
			keys = await service.updateMany(req.body.keys, req.body.data);
		} else {
			keys = await service.updateByQuery(req.body.query, req.body.data);
		}

		try {
			const result = await service.readMany(keys, req.sanitizedQuery);
			res.locals.payload = { data: result || null };
		} catch (error) {
			if (error instanceof ForbiddenException) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond
);

router.patch(
	'/:pk',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const primaryKey = await service.updateOne(req.params.pk, req.body);

		try {
			const record = await service.readOne(primaryKey, req.sanitizedQuery);
			res.locals.payload = { data: record || null };
		} catch (error) {
			if (error instanceof ForbiddenException) {
				return next();
			}

			throw error;
		}

		return next();
	}),
	respond
);

router.delete(
	'/',
	validateBatch('delete'),
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({
			accountability: req.accountability,
			schema: req.schema,
		});

		if (Array.isArray(req.body)) {
			await service.deleteMany(req.body);
		} else if (req.body.keys) {
			await service.deleteMany(req.body.keys);
		} else {
			await service.deleteByQuery(req.body.query);
		}

		return next();
	}),
	respond
);

router.delete(
	'/:pk',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({
			accountability: req.accountability,
			schema: req.schema,
		});

		await service.deleteOne(req.params.pk);

		return next();
	}),
	respond
);

export default router;
