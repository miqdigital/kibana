/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chain, fromEither, tryCatch } from 'fp-ts/TaskEither';
import { flow } from 'fp-ts/function';
import { validateEither } from '@kbn/securitysolution-io-ts-utils';
import {
  CreateEndpointListSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  createEndpointListSchema,
  exceptionListItemSchema,
  exceptionListSchema,
  foundExceptionListItemSchema,
  foundExceptionListSchema,
  AddEndpointExceptionListProps,
  AddExceptionListItemProps,
  AddExceptionListProps,
  ApiCallByIdProps,
  ApiCallByListIdProps,
  ApiCallFetchExceptionListsProps,
  ExportExceptionListProps,
  UpdateExceptionListItemProps,
  UpdateExceptionListProps,
  GetExceptionFilterFromExceptionListIdsProps,
  GetExceptionFilterFromExceptionsProps,
  ExceptionFilterResponse,
  DuplicateExceptionListProps,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  ENDPOINT_LIST_URL,
  INTERNAL_EXCEPTION_FILTER,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { toError, toPromise } from '../fp_utils';

const version = '2023-10-31';

/**
 * Add new ExceptionList
 *
 * @param http Kibana http service
 * @param list exception list to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
const addExceptionList = async ({
  http,
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    body: JSON.stringify(list),
    method: 'POST',
    signal,
    version,
  });

const addExceptionListWithValidation = async ({
  http,
  list,
  signal,
}: AddExceptionListProps): Promise<ExceptionListSchema> =>
  flow(
    () =>
      tryCatch(
        () =>
          addExceptionList({
            http,
            list,
            signal,
          }),
        toError
      ),
    chain((response) => fromEither(validateEither(exceptionListSchema, response))),
    flow(toPromise)
  )();

export { addExceptionListWithValidation as addExceptionList };

/**
 * Add new ExceptionListItem
 *
 * @param http Kibana http service
 * @param listItem exception list item to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
const addExceptionListItem = async ({
  http,
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    body: JSON.stringify(listItem),
    method: 'POST',
    signal,
    version,
  });

const addExceptionListItemWithValidation = async ({
  http,
  listItem,
  signal,
}: AddExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  flow(
    () =>
      tryCatch(
        () =>
          addExceptionListItem({
            http,
            listItem,
            signal,
          }),
        toError
      ),
    chain((response) => fromEither(validateEither(exceptionListItemSchema, response))),
    flow(toPromise)
  )();

export { addExceptionListItemWithValidation as addExceptionListItem };

/**
 * Update existing ExceptionList
 *
 * @param http Kibana http service
 * @param list exception list to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
const updateExceptionList = async ({
  http,
  list,
  signal,
}: UpdateExceptionListProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    body: JSON.stringify(list),
    method: 'PUT',
    signal,
    version,
  });

const updateExceptionListWithValidation = async ({
  http,
  list,
  signal,
}: UpdateExceptionListProps): Promise<ExceptionListSchema> =>
  flow(
    () =>
      tryCatch(
        () =>
          updateExceptionList({
            http,
            list,
            signal,
          }),
        toError
      ),
    chain((response) => fromEither(validateEither(exceptionListSchema, response))),
    flow(toPromise)
  )();

export { updateExceptionListWithValidation as updateExceptionList };

/**
 * Update existing ExceptionListItem
 *
 * @param http Kibana http service
 * @param listItem exception list item to add
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
const updateExceptionListItem = async ({
  http,
  listItem,
  signal,
}: UpdateExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    body: JSON.stringify(listItem),
    method: 'PUT',
    signal,
    version,
  });

const updateExceptionListItemWithValidation = async ({
  http,
  listItem,
  signal,
}: UpdateExceptionListItemProps): Promise<ExceptionListItemSchema> =>
  flow(
    () =>
      tryCatch(
        () =>
          updateExceptionListItem({
            http,
            listItem,
            signal,
          }),
        toError
      ),
    chain((response) => fromEither(validateEither(exceptionListItemSchema, response))),
    flow(toPromise)
  )();

export { updateExceptionListItemWithValidation as updateExceptionListItem };

/**
 * Fetch all ExceptionLists (optionally by namespaceType)
 *
 * @param http Kibana http service
 * @param namespaceTypes ExceptionList namespace_types of lists to find
 * @param filters search bar filters
 * @param pagination optional
 * @param signal to cancel request
 *
 * @throws An error if request params or response is not OK
 */
const fetchExceptionLists = async ({
  http,
  filters,
  namespaceTypes,
  pagination,
  signal,
  sort,
}: ApiCallFetchExceptionListsProps): Promise<FoundExceptionListSchema> => {
  const query = {
    filter: filters || undefined,
    namespace_type: namespaceTypes,
    page: pagination.page ? `${pagination.page}` : '1',
    per_page: pagination.perPage ? `${pagination.perPage}` : '20',
    sort_field: sort?.field ? sort?.field : 'exception-list.created_at',
    sort_order: sort?.order ? sort?.order : 'desc',
  };

  return http.fetch<FoundExceptionListSchema>(`${EXCEPTION_LIST_URL}/_find`, {
    method: 'GET',
    query,
    signal,
    version,
  });
};

const fetchExceptionListsWithValidation = async ({
  filters,
  http,
  namespaceTypes,
  pagination,
  signal,
  sort,
}: ApiCallFetchExceptionListsProps): Promise<FoundExceptionListSchema> =>
  flow(
    () =>
      tryCatch(
        () =>
          fetchExceptionLists({
            filters,
            http,
            namespaceTypes,
            pagination,
            signal,
            sort,
          }),
        toError
      ),
    chain((response) => fromEither(validateEither(foundExceptionListSchema, response))),
    flow(toPromise)
  )();

export { fetchExceptionListsWithValidation as fetchExceptionLists };

/**
 * Fetch an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
const fetchExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    method: 'GET',
    query: { id, namespace_type: namespaceType },
    signal,
    version,
  });

const fetchExceptionListByIdWithValidation = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> =>
  flow(
    () =>
      tryCatch(
        () =>
          fetchExceptionListById({
            http,
            id,
            namespaceType,
            signal,
          }),
        toError
      ),
    chain((response) => fromEither(validateEither(exceptionListSchema, response))),
    flow(toPromise)
  )();

export { fetchExceptionListByIdWithValidation as fetchExceptionListById };

/**
 * Fetch an ExceptionList's ExceptionItems by providing a ExceptionList list_id
 *
 * @param http Kibana http service
 * @param listIds ExceptionList list_ids (not ID)
 * @param namespaceTypes ExceptionList namespace_types
 * @param search optional - simple search string
 * @param filter optional
 * @param pagination optional
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
const fetchExceptionListsItemsByListIds = async ({
  http,
  listIds,
  namespaceTypes,
  filter,
  pagination,
  search,
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> => {
  const query = {
    list_id: listIds.join(','),
    namespace_type: namespaceTypes.join(','),
    page: pagination.page ? `${pagination.page}` : '1',
    per_page: pagination.perPage ? `${pagination.perPage}` : '20',
    search,
    sort_field: 'exception-list.created_at',
    sort_order: 'desc',
    filter,
  };

  return http.fetch<FoundExceptionListItemSchema>(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
    method: 'GET',
    query,
    signal,
    version,
  });
};

const fetchExceptionListsItemsByListIdsWithValidation = async ({
  filter,
  http,
  listIds,
  namespaceTypes,
  pagination,
  search,
  signal,
}: ApiCallByListIdProps): Promise<FoundExceptionListItemSchema> =>
  flow(
    () =>
      tryCatch(
        () =>
          fetchExceptionListsItemsByListIds({
            filter,
            http,
            listIds,
            namespaceTypes,
            pagination,
            search,
            signal,
          }),
        toError
      ),
    chain((response) => fromEither(validateEither(foundExceptionListItemSchema, response))),
    flow(toPromise)
  )();

export { fetchExceptionListsItemsByListIdsWithValidation as fetchExceptionListsItemsByListIds };

/**
 * Fetch an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param http Kibana http service
 * @param id ExceptionListItem ID (not item_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
const fetchExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    method: 'GET',
    query: { id, namespace_type: namespaceType },
    signal,
    version,
  });

const fetchExceptionListItemByIdWithValidation = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  flow(
    () => tryCatch(() => fetchExceptionListItemById({ http, id, namespaceType, signal }), toError),
    chain((response) => fromEither(validateEither(exceptionListItemSchema, response))),
    flow(toPromise)
  )();

export { fetchExceptionListItemByIdWithValidation as fetchExceptionListItemById };

/**
 * Delete an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
const deleteExceptionListById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(EXCEPTION_LIST_URL, {
    method: 'DELETE',
    query: { id, namespace_type: namespaceType },
    signal,
    version,
  });

const deleteExceptionListByIdWithValidation = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListSchema> =>
  flow(
    () => tryCatch(() => deleteExceptionListById({ http, id, namespaceType, signal }), toError),
    chain((response) => fromEither(validateEither(exceptionListSchema, response))),
    flow(toPromise)
  )();

export { deleteExceptionListByIdWithValidation as deleteExceptionListById };

/**
 * Delete an ExceptionListItem by providing a ExceptionListItem ID
 *
 * @param http Kibana http service
 * @param id ExceptionListItem ID (not item_id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
const deleteExceptionListItemById = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  http.fetch<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    method: 'DELETE',
    query: { id, namespace_type: namespaceType },
    signal,
    version,
  });

const deleteExceptionListItemByIdWithValidation = async ({
  http,
  id,
  namespaceType,
  signal,
}: ApiCallByIdProps): Promise<ExceptionListItemSchema> =>
  flow(
    () => tryCatch(() => deleteExceptionListItemById({ http, id, namespaceType, signal }), toError),
    chain((response) => fromEither(validateEither(exceptionListItemSchema, response))),
    flow(toPromise)
  )();

export { deleteExceptionListItemByIdWithValidation as deleteExceptionListItemById };

/**
 * Add new Endpoint ExceptionList
 *
 * @param http Kibana http service
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 *
 */
const addEndpointExceptionList = async ({
  http,
  signal,
}: AddEndpointExceptionListProps): Promise<CreateEndpointListSchema> =>
  http.fetch<ExceptionListItemSchema>(ENDPOINT_LIST_URL, {
    method: 'POST',
    signal,
    version,
  });

const addEndpointExceptionListWithValidation = async ({
  http,
  signal,
}: AddEndpointExceptionListProps): Promise<CreateEndpointListSchema> =>
  flow(
    () => tryCatch(() => addEndpointExceptionList({ http, signal }), toError),
    chain((response) => fromEither(validateEither(createEndpointListSchema, response))),
    flow(toPromise)
  )();

export { addEndpointExceptionListWithValidation as addEndpointExceptionList };

/**
 * Export an ExceptionList by providing a ExceptionList ID
 *
 * @param http Kibana http service
 * @param id ExceptionList ID (not list_id)
 * @param includeExpiredExceptions boolean for including expired exceptions
 * @param listId ExceptionList LIST_ID (not id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const exportExceptionList = async ({
  http,
  id,
  includeExpiredExceptions,
  listId,
  namespaceType,
  signal,
}: ExportExceptionListProps): Promise<Blob> =>
  http.fetch<Blob>(`${EXCEPTION_LIST_URL}/_export`, {
    method: 'POST',
    query: {
      id,
      list_id: listId,
      namespace_type: namespaceType,
      include_expired_exceptions: includeExpiredExceptions,
    },
    signal,
    version,
  });

/**
 * Create a Filter query from an exception list id
 *
 * @param exceptionListId The id of the exception list from which create a Filter query
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getExceptionFilterFromExceptionListIds = async ({
  alias,
  chunkSize,
  exceptionListIds,
  excludeExceptions,
  http,
  signal,
}: GetExceptionFilterFromExceptionListIdsProps): Promise<ExceptionFilterResponse> =>
  http.fetch(INTERNAL_EXCEPTION_FILTER, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      exception_list_ids: exceptionListIds,
      type: 'exception_list_ids',
      alias,
      exclude_exceptions: excludeExceptions,
      chunk_size: chunkSize,
    }),
    signal,
  });

/**
 * Create a Filter query from a list of exceptions
 *
 * @param exceptions Exception items to be made into a `Filter` query
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getExceptionFilterFromExceptions = async ({
  exceptions,
  alias,
  excludeExceptions,
  http,
  chunkSize,
  signal,
}: GetExceptionFilterFromExceptionsProps): Promise<ExceptionFilterResponse> =>
  http.fetch(INTERNAL_EXCEPTION_FILTER, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      exceptions,
      type: 'exception_items',
      alias,
      exclude_exceptions: excludeExceptions,
      chunk_size: chunkSize,
    }),
    signal,
  });

/**
 * Duplicate an ExceptionList and its items by providing a ExceptionList list_id
 *
 * @param http Kibana http service
 * @param includeExpiredExceptions boolean for including exception items with expired TTL
 * @param listId ExceptionList LIST_ID (not id)
 * @param namespaceType ExceptionList namespace_type
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const duplicateExceptionList = async ({
  http,
  includeExpiredExceptions,
  listId,
  namespaceType,
  signal,
}: DuplicateExceptionListProps): Promise<ExceptionListSchema> =>
  http.fetch<ExceptionListSchema>(`${EXCEPTION_LIST_URL}/_duplicate`, {
    method: 'POST',
    query: {
      list_id: listId,
      namespace_type: namespaceType,
      include_expired_exceptions: includeExpiredExceptions,
    },
    signal,
    version,
  });
