/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchSource } from '@kbn/data-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  findListItems,
  getSavedVisualization,
  saveVisualization,
  SAVED_VIS_TYPE,
} from './saved_visualize_utils';
import { VisTypeAlias, TypesStart } from '../vis_types';
import type { VisSavedObject } from '../types';
import { noop } from 'lodash';

let visTypes = [] as VisTypeAlias[];
const mockGetAliases = jest.fn(() => visTypes);
const mockGetTypes = jest.fn((type: string) => type) as unknown as TypesStart['get'];
const mockFindContent = jest.fn(() => ({
  pagination: { total: 0 },
  hits: [],
}));
const mockGetContent = jest.fn(() => ({
  item: {
    id: 'test',
    references: [
      {
        id: 'test',
        type: 'index-pattern',
      },
    ],
    attributes: {
      visState: JSON.stringify({ type: 'area' }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{filter: []}',
      },
    },
    _version: '1',
  },
  meta: {
    outcome: 'exact',
    alias_target_id: null,
  },
}));
const mockCreateContent = jest.fn(() => ({
  item: {
    id: 'test',
  },
}));

const mockUpdateContent = jest.fn(() => ({
  item: {
    id: 'test',
  },
}));

jest.mock('../services', () => ({
  getSpaces: jest.fn(() => ({
    getActiveSpace: () => ({
      id: 'test',
    }),
  })),
  getContentManagement: jest.fn(() => ({
    client: {
      create: mockCreateContent,
      update: mockUpdateContent,
      get: mockGetContent,
      search: mockFindContent,
      mSearch: mockFindContent,
    },
  })),
}));

const mockParseSearchSourceJSON = jest.fn();
const mockInjectSearchSourceReferences = jest.fn();
const mockExtractSearchSourceReferences = jest.fn((..._args) => [{}, []]);

jest.mock('@kbn/data-plugin/public', () => ({
  extractSearchSourceReferences: jest.fn((...args) => mockExtractSearchSourceReferences(...args)),
  injectSearchSourceReferences: jest.fn((...args) => mockInjectSearchSourceReferences(...args)),
  parseSearchSourceJSON: jest.fn((...args) => mockParseSearchSourceJSON(...args)),
}));

const mockInjectReferences = jest.fn();
const mockExtractReferences = jest.fn((arg) => arg);
jest.mock('./saved_visualization_references', () => ({
  injectReferences: jest.fn((...args) => mockInjectReferences(...args)),
  extractReferences: jest.fn((arg) => mockExtractReferences(arg)),
}));

let isTitleDuplicateConfirmed = true;
const mockCheckForDuplicateTitle = jest.fn(() => {
  if (!isTitleDuplicateConfirmed) {
    throw new Error();
  }
});
const mockSaveWithConfirmation = jest.fn(() => ({ item: { id: 'test-after-confirm' } }));
jest.mock('./saved_objects_utils/check_for_duplicate_title', () => ({
  checkForDuplicateTitle: jest.fn(() => mockCheckForDuplicateTitle()),
}));
jest.mock('./saved_objects_utils/save_with_confirmation', () => ({
  saveWithConfirmation: jest.fn(() => mockSaveWithConfirmation()),
}));

describe('saved_visualize_utils', () => {
  const coreStart = coreMock.createStart();
  const { dataViews, search } = dataPluginMock.createStartContract();

  describe('getSavedVisualization', () => {
    beforeEach(() => {
      mockParseSearchSourceJSON.mockClear();
      mockInjectSearchSourceReferences.mockClear();
      mockInjectReferences.mockClear();
    });
    it('should return object with defaults if was not provided id', async () => {
      const savedVis = await getSavedVisualization({
        ...coreStart,
        search,
        dataViews,
        spaces: Promise.resolve({
          getActiveSpace: () => ({
            id: 'test',
          }),
        }) as unknown as SpacesPluginStart,
      });
      expect(savedVis).toBeDefined();
      expect(savedVis.title).toBe('');
      expect(savedVis.displayName).toBe(SAVED_VIS_TYPE);
    });

    it('should create search source if saved object has searchSourceJSON', async () => {
      await getSavedVisualization(
        {
          ...coreStart,
          search,
          dataViews,
          spaces: Promise.resolve({
            getActiveSpace: () => ({
              id: 'test',
            }),
          }) as unknown as SpacesPluginStart,
        },
        { id: 'test', searchSource: true }
      );
      expect(mockParseSearchSourceJSON).toHaveBeenCalledWith('{filter: []}');
      expect(mockInjectSearchSourceReferences).toHaveBeenCalled();
      expect(search.searchSource.create).toHaveBeenCalled();
    });

    it('should inject references if saved object has references', async () => {
      await getSavedVisualization(
        {
          ...coreStart,
          search,
          dataViews,
          spaces: Promise.resolve({
            getActiveSpace: () => ({
              id: 'test',
            }),
          }) as unknown as SpacesPluginStart,
        },
        { id: 'test', searchSource: true }
      );
      expect(mockInjectReferences.mock.calls[0][1]).toEqual([
        {
          id: 'test',
          type: 'index-pattern',
        },
      ]);
    });

    it('should call getTagIdsFromReferences if we provide savedObjectsTagging service', async () => {
      const mockGetTagIdsFromReferences = jest.fn(() => ['test']);
      await getSavedVisualization(
        {
          ...coreStart,
          search,
          dataViews,
          spaces: Promise.resolve({
            getActiveSpace: () => ({
              id: 'test',
            }),
          }) as unknown as SpacesPluginStart,
          savedObjectsTagging: {
            ui: {
              getTagIdsFromReferences: mockGetTagIdsFromReferences,
            },
          } as unknown as SavedObjectsTaggingApi,
        },
        { id: 'test', searchSource: true }
      );
      expect(mockGetTagIdsFromReferences).toHaveBeenCalled();
    });
  });

  describe('saveVisualization', () => {
    let vis: VisSavedObject;
    beforeEach(() => {
      mockExtractSearchSourceReferences.mockClear();
      mockExtractReferences.mockClear();
      mockSaveWithConfirmation.mockClear();
      mockCreateContent.mockClear();
      mockUpdateContent.mockClear();
      vis = {
        visState: {
          type: 'area',
          params: {},
        },
        title: 'test',
        uiStateJSON: '{}',
        version: '1',
        __tags: [],
        lastSavedTitle: 'test',
        displayName: 'test',
        getEsType: () => 'vis',
      } as unknown as VisSavedObject;
    });

    it('should return id after save', async () => {
      const savedVisId = await saveVisualization(vis, {}, coreStart);
      expect(mockCreateContent).toHaveBeenCalled();
      expect(mockExtractReferences).toHaveBeenCalled();
      expect(savedVisId).toBe('test');
    });

    it('should call extractSearchSourceReferences if we new vis has searchSourceFields', async () => {
      vis.searchSourceFields = { fields: [] };
      await saveVisualization(vis, {}, coreStart);
      expect(mockExtractSearchSourceReferences).toHaveBeenCalledWith(vis.searchSourceFields);
    });

    it('should serialize searchSource', async () => {
      vis.searchSource = {
        serialize: jest.fn(() => ({ searchSourceJSON: '{}', references: [] })),
      } as unknown as ISearchSource;
      await saveVisualization(vis, {}, coreStart);
      expect(vis.searchSource?.serialize).toHaveBeenCalled();
    });

    it('should call updateTagsReferences if we provide savedObjectsTagging service', async () => {
      const mockUpdateTagsReferences = jest.fn(() => []);
      await saveVisualization(
        vis,
        {},
        {
          ...coreStart,
          savedObjectsTagging: {
            ui: {
              updateTagsReferences: mockUpdateTagsReferences,
            },
          } as unknown as SavedObjectsTaggingApi,
        }
      );
      expect(mockUpdateTagsReferences).toHaveBeenCalled();
    });

    describe('confirmOverwrite', () => {
      it('as false we should not call saveWithConfirmation and just do create', async () => {
        const savedVisId = await saveVisualization(vis, { confirmOverwrite: false }, coreStart);
        expect(mockCreateContent).toHaveBeenCalled();
        expect(mockExtractReferences).toHaveBeenCalled();
        expect(mockSaveWithConfirmation).not.toHaveBeenCalled();
        expect(savedVisId).toBe('test');
      });

      it('as true we should call saveWithConfirmation', async () => {
        const savedVisId = await saveVisualization(vis, { confirmOverwrite: true }, coreStart);
        expect(mockCreateContent).not.toHaveBeenCalled();
        expect(mockSaveWithConfirmation).toHaveBeenCalled();
        expect(savedVisId).toBe('test-after-confirm');
      });
    });

    describe('isTitleDuplicateConfirmed', () => {
      it('as false we should not save vis with duplicated title', async () => {
        isTitleDuplicateConfirmed = false;
        try {
          const savedVisId = await saveVisualization(
            vis,
            { isTitleDuplicateConfirmed, onTitleDuplicate: noop },
            coreStart
          );
          expect(savedVisId).toBe('');
        } catch {
          // ignore
        }
        expect(mockCreateContent).not.toHaveBeenCalled();
        expect(mockSaveWithConfirmation).not.toHaveBeenCalled();
        expect(mockCheckForDuplicateTitle).toHaveBeenCalled();
        expect(vis.id).toBeUndefined();
      });

      it('as false we should save vis with duplicated title if onTitleDuplicate is not defined', async () => {
        isTitleDuplicateConfirmed = false;
        const savedVisId = await saveVisualization(
          vis,
          { isTitleDuplicateConfirmed, onTitleDuplicate: undefined },
          coreStart
        );
        expect(mockCheckForDuplicateTitle).toHaveBeenCalled();
        expect(mockCreateContent).toHaveBeenCalled();
        expect(savedVisId).toBe('test');
        expect(vis.id).toBe('test');
      });

      it('as true we should save vis with duplicated title', async () => {
        isTitleDuplicateConfirmed = true;
        const savedVisId = await saveVisualization(vis, { isTitleDuplicateConfirmed }, coreStart);
        expect(mockCheckForDuplicateTitle).toHaveBeenCalled();
        expect(mockCreateContent).toHaveBeenCalled();
        expect(savedVisId).toBe('test');
        expect(vis.id).toBe('test');
      });
    });
  });

  describe('findListItems', () => {
    function testProps() {
      return {
        search: '',
        size: 10,
      };
    }

    beforeEach(() => {
      mockFindContent.mockClear();
    });

    it('searches visualization title and description', async () => {
      const props = testProps();
      await findListItems(
        { get: mockGetTypes, getAliases: mockGetAliases },
        props.search,
        props.size
      );
      expect(mockFindContent.mock.calls).toMatchObject([
        [
          {
            options: {
              types: ['visualization'],
              searchFields: ['title^3', 'description'],
            },
          },
        ],
      ]);
    });

    it('searches searchFields and types specified by app extensions', async () => {
      const props = testProps();
      visTypes = [
        {
          appExtensions: {
            visualizations: {
              docTypes: ['bazdoc', 'etc'],
              searchFields: ['baz', 'bing'],
            },
          },
        } as VisTypeAlias,
      ];
      await findListItems(
        { get: mockGetTypes, getAliases: mockGetAliases },
        props.search,
        props.size
      );
      expect(mockFindContent.mock.calls).toMatchObject([
        [
          {
            contentTypes: [
              { contentTypeId: 'bazdoc' },
              { contentTypeId: 'etc' },
              { contentTypeId: 'visualization' },
            ],
          },
        ],
      ]);
    });

    it('deduplicates types and search fields', async () => {
      const props = testProps();
      visTypes = [
        {
          appExtensions: {
            visualizations: {
              docTypes: ['bazdoc', 'bar'],
              searchFields: ['baz', 'bing', 'barfield'],
            },
          },
        } as VisTypeAlias,
        {
          appExtensions: {
            visualizations: {
              docTypes: ['visualization', 'foo', 'bazdoc'],
              searchFields: ['baz', 'bing', 'foofield'],
            },
          },
        } as VisTypeAlias,
      ];
      await findListItems(
        { get: mockGetTypes, getAliases: mockGetAliases },
        props.search,
        props.size
      );
      expect(mockFindContent.mock.calls).toMatchObject([
        [
          {
            contentTypes: [
              { contentTypeId: 'bazdoc' },
              { contentTypeId: 'bar' },
              { contentTypeId: 'visualization' },
              { contentTypeId: 'foo' },
            ],
          },
        ],
      ]);
    });

    it('searches the search term prefix', async () => {
      const props = {
        ...testProps(),
        search: 'ahoythere',
      };
      await findListItems(
        { get: mockGetTypes, getAliases: mockGetAliases },
        props.search,
        props.size
      );
      expect(mockFindContent.mock.calls).toMatchObject([
        [
          {
            query: { text: 'ahoythere*' },
          },
        ],
      ]);
    });

    it('searches with references', async () => {
      const props = {
        ...testProps(),
        references: [
          { type: 'foo', id: 'hello', name: 'foo' },
          { type: 'bar', id: 'dolly', name: 'bar' },
        ],
      };
      await findListItems(
        { get: mockGetTypes, getAliases: mockGetAliases },
        props.search,
        props.size,
        props.references
      );
      expect(mockFindContent.mock.calls).toMatchObject([
        [
          {
            query: {
              tags: {
                included: ['hello', 'dolly'],
              },
            },
          },
        ],
      ]);
    });

    it('uses type-specific toListItem function, if available', async () => {
      const props = testProps();

      visTypes = [
        {
          appExtensions: {
            visualizations: {
              docTypes: ['wizard'],
              toListItem(savedObject) {
                return {
                  id: savedObject.id,
                  title: `${(savedObject.attributes as any).label} THE GRAY`,
                };
              },
            },
          },
        } as VisTypeAlias,
      ];
      (mockFindContent as jest.Mock).mockImplementationOnce(async () => ({
        pagination: { total: 2 },
        hits: [
          {
            id: 'lotr',
            type: 'wizard',
            attributes: { label: 'Gandalf' },
          },
          {
            id: 'wat',
            type: 'visualization',
            attributes: { title: 'WATEVER', typeName: 'test' },
          },
        ],
      }));

      const items = await findListItems(
        { get: mockGetTypes, getAliases: mockGetAliases },
        props.search,
        props.size
      );
      expect(items).toEqual({
        total: 2,
        hits: [
          {
            id: 'lotr',
            references: undefined,
            title: 'Gandalf THE GRAY',
          },
          {
            id: 'wat',
            image: undefined,
            editor: {
              editUrl: '/edit/wat',
            },
            readOnly: false,
            references: undefined,
            icon: undefined,
            savedObjectType: 'visualization',
            type: 'test',
            typeName: 'test',
            typeTitle: undefined,
            updatedAt: undefined,
            title: 'WATEVER',
            url: '#/edit/wat',
          },
        ],
      });
    });
  });
});
