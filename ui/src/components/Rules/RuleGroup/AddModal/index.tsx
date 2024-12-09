import React, { useContext, useEffect, useRef, useState } from 'react'
import GetApiHandler, {
  PostApiHandler,
  PutApiHandler,
} from '../../../../utils/ApiHandler'
import RuleCreator, { IRule } from '../../Rule/RuleCreator'
import ConstantsContext, {
  Application,
} from '../../../../contexts/constants-context'
import LibrariesContext, {
  ILibrary,
} from '../../../../contexts/libraries-context'
import Alert from '../../../Common/Alert'
import ArrAction from './ArrAction'
import { IRuleGroup } from '..'
import { ICollection } from '../../../Collection'
import {
  BanIcon,
  DownloadIcon,
  QuestionMarkCircleIcon,
  SaveIcon,
  UploadIcon,
} from '@heroicons/react/solid'
import Router from 'next/router'
import Link from 'next/link'
import Button from '../../../Common/Button'
import CommunityRuleModal from '../../../Common/CommunityRuleModal'
import { EPlexDataType } from '../../../../utils/PlexDataType-enum'
import CachedImage from '../../../Common/CachedImage'
import YamlImporterModal from '../../../Common/YamlImporterModal'
import { CloudDownloadIcon } from '@heroicons/react/outline'
import { useToasts } from 'react-toast-notifications'
import Modal from '../../../Common/Modal'

interface AddModal {
  editData?: IRuleGroup
  onCancel: () => void
  onSuccess: () => void
}

interface ICreateApiObject {
  name: string
  description: string
  libraryId: number
  arrAction: number
  isActive: boolean
  useRules: boolean
  listExclusions: boolean
  forceOverseerr: boolean
  tautulliWatchedPercentOverride?: number
  radarrSettingsId?: number
  sonarrSettingsId?: number
  collection: {
    visibleOnHome: boolean
    deleteAfterDays: number
    manualCollection?: boolean
    manualCollectionName?: string
    keepLogsForMonths?: number
  }
  rules: IRule[]
  dataType: EPlexDataType
}

const AddModal = (props: AddModal) => {
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>(
    props.editData ? props.editData.libraryId.toString() : '1',
  )
  const [selectedType, setSelectedType] = useState<string>(
    props.editData && props.editData.type
      ? props.editData.type.toString()
      : '1',
  )
  const [selectedLibrary, setSelectedLibrary] = useState<ILibrary>()
  const [collection, setCollection] = useState<ICollection>()
  const [isLoading, setIsLoading] = useState(true)
  const [CommunityModal, setCommunityModal] = useState(false)
  const [yamlImporterModal, setYamlImporterModal] = useState(false)
  const yaml = useRef<string>()

  const nameRef = useRef<any>()
  const descriptionRef = useRef<any>()
  const libraryRef = useRef<any>()
  const collectionTypeRef = useRef<any>(EPlexDataType.MOVIES)
  const deleteAfterRef = useRef<any>()
  const keepLogsForMonthsRef = useRef<any>()
  const tautulliWatchedPercentOverrideRef = useRef<any>()
  const manualCollectionNameRef = useRef<any>('My custom collection')
  const [showHome, setShowHome] = useState<boolean>(true)
  const [listExclusion, setListExclusion] = useState<boolean>(true)
  const [forceOverseerr, setForceOverseerr] = useState<boolean>(false)
  const [manualCollection, setManualCollection] = useState<boolean>(false)
  const ConstantsCtx = useContext(ConstantsContext)

  const { addToast } = useToasts()

  const [useRules, setUseRules] = useState<boolean>(
    props.editData ? props.editData.useRules : true,
  )
  const [arrOption, setArrOption] = useState<number>()
  const [radarrSettingsId, setRadarrSettingsId] = useState<number>()
  const [sonarrSettingsId, setSonarrSettingsId] = useState<number>()
  const [originalRadarrSettingsId, setOriginalRadarrSettingsId] =
    useState<number>()
  const [originalSonarrSettingsId, setOriginalSonarrSettingsId] =
    useState<number>()
  const [showArrServerChangeWarning, setShowArrServerChangeWarning] =
    useState<boolean>(false)
  const [active, setActive] = useState<boolean>(
    props.editData ? props.editData.isActive : true,
  )
  const [rules, setRules] = useState<IRule[]>(
    props.editData
      ? props.editData.rules.map((r) => JSON.parse(r.ruleJson) as IRule)
      : [],
  )
  const [error, setError] = useState<boolean>(false)
  const [formIncomplete, setFormIncomplete] = useState<boolean>(false)
  const ruleCreatorVersion = useRef<number>(1)
  const LibrariesCtx = useContext(LibrariesContext)
  const tautulliEnabled =
    ConstantsCtx.constants.applications?.some(
      (x) => x.id == Application.TAUTULLI,
    ) ?? false
  const overseerrEnabled =
    ConstantsCtx.constants.applications?.some(
      (x) => x.id == Application.OVERSEERR,
    ) ?? false

  function setLibraryId(event: { target: { value: string } }) {
    setSelectedLibraryId(event.target.value)
    setArrOption(0)
  }

  function setCollectionType(event: { target: { value: string } }) {
    setSelectedType(event.target.value)
    setArrOption(0)
  }

  const handleUpdateArrAction = (
    type: 'Radarr' | 'Sonarr',
    e: number,
    settingId?: number,
  ) => {
    setArrOption(e)

    if (type === 'Radarr') {
      setSonarrSettingsId(undefined)
      setOriginalSonarrSettingsId(undefined)
      setRadarrSettingsId(settingId)

      if (
        props.editData &&
        originalRadarrSettingsId != null &&
        originalRadarrSettingsId != settingId &&
        settingId != radarrSettingsId
      ) {
        setShowArrServerChangeWarning(true)
      }
    } else if (type === 'Sonarr') {
      setRadarrSettingsId(undefined)
      setOriginalRadarrSettingsId(undefined)
      setSonarrSettingsId(settingId)

      if (
        props.editData &&
        originalSonarrSettingsId != null &&
        originalSonarrSettingsId != settingId &&
        settingId != sonarrSettingsId
      ) {
        setShowArrServerChangeWarning(true)
      }
    }
  }

  function updateRules(rules: IRule[]) {
    setRules(rules)
  }

  const toggleCommunityRuleModal = (e: any) => {
    e.preventDefault()

    if (CommunityModal) {
      setCommunityModal(false)
    } else {
      setCommunityModal(true)
    }
  }

  const toggleYamlExporter = async (e: any) => {
    e.preventDefault()
    const response = await PostApiHandler('/rules/yaml/encode', {
      rules: JSON.stringify(rules),
      mediaType: selectedType,
    })

    if (response.code === 1) {
      yaml.current = response.result

      if (!yamlImporterModal) {
        setYamlImporterModal(true)
      } else {
        setYamlImporterModal(false)
      }
    }
  }

  const toggleYamlImporter = (e: any) => {
    e.preventDefault()
    yaml.current = undefined
    if (!yamlImporterModal) {
      setYamlImporterModal(true)
    } else {
      setYamlImporterModal(false)
    }
  }

  const importRulesFromYaml = async (yaml: string) => {
    const response = await PostApiHandler('/rules/yaml/decode', {
      yaml: yaml,
      mediaType: selectedType,
    })

    if (response && response.code === 1) {
      const result: { mediaType: string; rules: IRule[] } = JSON.parse(
        response.result,
      )
      handleLoadRules(result.rules)
      addToast('Successfully imported rules from Yaml.', {
        autoDismiss: true,
        appearance: 'success',
      })
    } else {
      addToast(response.message, {
        autoDismiss: true,
        appearance: 'error',
      })
    }
  }

  const handleLoadRules = (rules: IRule[]) => {
    updateRules(rules)
    ruleCreatorVersion.current = ruleCreatorVersion.current + 1
    setCommunityModal(false)
  }

  const cancel = () => {
    props.onCancel()
  }

  useEffect(() => {
    const lib = LibrariesCtx.libraries.find(
      (el: ILibrary) => +el.key === +selectedLibraryId,
    )
    setSelectedLibrary(lib)
    setSelectedType(lib?.type === 'movie' ? '1' : '2')
  }, [selectedLibraryId])

  useEffect(() => {
    setIsLoading(true)

    const load = async () => {
      const constantsPromise = GetApiHandler('/rules/constants')
      const librariesPromise =
        LibrariesCtx.libraries.length <= 0
          ? GetApiHandler('/plex/libraries/')
          : Promise.resolve(null)
      const collectionPromise: Promise<ICollection | null> = props.editData
        ? GetApiHandler(
            `/collections/collection/${props.editData.collectionId}`,
          )
        : Promise.resolve(null)

      const [constants, libraries, collection] = await Promise.all([
        constantsPromise,
        librariesPromise,
        collectionPromise,
      ])

      ConstantsCtx.setConstants(constants)

      if (libraries != null) {
        if (libraries) {
          LibrariesCtx.addLibraries(libraries)
        } else {
          LibrariesCtx.addLibraries([])
        }
      }

      if (collection) {
        setCollection(collection)
        setShowHome(collection.visibleOnHome!)
        setListExclusion(collection.listExclusions!)
        setForceOverseerr(collection.forceOverseerr!)
        setArrOption(collection.arrAction)
        setSelectedType(collection.type ? collection.type.toString() : '1')
        setManualCollection(collection.manualCollection)
        setRadarrSettingsId(collection.radarrSettingsId)
        setSonarrSettingsId(collection.sonarrSettingsId)
        setOriginalRadarrSettingsId(collection.radarrSettingsId)
        setOriginalSonarrSettingsId(collection.sonarrSettingsId)
      }

      setIsLoading(false)
    }

    load()
  }, [])

  useEffect(() => {
    // trapping next router before-pop-state to manipulate router change on browser back button
    Router.beforePopState(() => {
      props.onCancel()
      window.history.forward()
      return false
    })
    return () => {
      Router.beforePopState(() => {
        return true
      })
    }
  }, [])

  const create = (e: any) => {
    e.preventDefault()
    if (
      nameRef.current.value &&
      libraryRef.current.value &&
      deleteAfterRef.current.value &&
      ((useRules && rules.length > 0) || !useRules)
    ) {
      setFormIncomplete(false)
      const creationObj: ICreateApiObject = {
        name: nameRef.current.value,
        description: descriptionRef.current.value,
        libraryId: +libraryRef.current.value,
        arrAction: arrOption ? arrOption : 0,
        dataType: +selectedType,
        isActive: active,
        useRules: useRules,
        listExclusions: listExclusion,
        forceOverseerr: forceOverseerr,
        tautulliWatchedPercentOverride:
          tautulliWatchedPercentOverrideRef.current &&
          tautulliWatchedPercentOverrideRef.current.value != ''
            ? +tautulliWatchedPercentOverrideRef.current.value
            : undefined,
        radarrSettingsId: radarrSettingsId,
        sonarrSettingsId: sonarrSettingsId,
        collection: {
          visibleOnHome: showHome,
          deleteAfterDays: +deleteAfterRef.current.value,
          manualCollection: manualCollection,
          manualCollectionName: manualCollectionNameRef.current.value,
          keepLogsForMonths: +keepLogsForMonthsRef.current.value,
        },
        rules: useRules ? rules : [],
      }

      if (!props.editData) {
        PostApiHandler('/rules', creationObj)
          .then((resp) => {
            if (resp.code === 1) props.onSuccess()
            else setError(true)
          })
          .catch((err) => {
            setError(true)
          })
      } else {
        PutApiHandler('/rules', { id: props.editData.id, ...creationObj })
          .then((resp) => {
            if (resp.code === 1) props.onSuccess()
            else setError(true)
          })
          .catch((err) => {
            setError(true)
          })
      }
    } else {
      setFormIncomplete(true)
    }
  }

  if (isLoading) {
    return (
      <span>
        <CachedImage fill src="/spinner.svg" alt="Loading..." />
      </span>
    )
  }

  return (
    <>
      <div className="h-full w-full">
        <div className="max-width-form-head flex">
          <div className="ml-0">
            <h3 className="heading">General</h3>
            <p className="description">
              General information about this group of rules
            </p>
          </div>
          <div className="ml-auto">
            <Link
              legacyBehavior
              href={`https://docs.maintainerr.info/Rules`}
              passHref={true}
            >
              <a target="_blank" rel="noopener noreferrer">
                <Button className="ml-3" buttonType="default" type="button">
                  <QuestionMarkCircleIcon />
                  <span>Help</span>
                </Button>
              </a>
            </Link>
          </div>
        </div>

        {error ? (
          <Alert>
            Something went wrong saving the group.. Please verify that all
            values are valid
          </Alert>
        ) : undefined}
        {formIncomplete ? (
          <Alert>
            Not all required (*) fields contain values and at least 1 valid rule
            is required
          </Alert>
        ) : undefined}
        <div className="section">
          <form>
            <div className="form-row">
              <label htmlFor="name" className="text-label">
                Name *
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <input
                    name="name"
                    id="name"
                    type="text"
                    ref={nameRef}
                    defaultValue={props.editData?.name}
                  ></input>
                </div>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="description" className="text-label">
                Description
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <textarea
                    name="description"
                    id="description"
                    rows={5}
                    defaultValue={props.editData?.description}
                    ref={descriptionRef}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="library" className="text-label">
                Library *
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <select
                    name="library"
                    id="library"
                    value={selectedLibraryId}
                    onChange={setLibraryId}
                    ref={libraryRef}
                  >
                    {LibrariesCtx.libraries.map((data: ILibrary) => {
                      return (
                        <option key={data.key} value={data.key}>
                          {data.title}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            </div>
            {selectedLibrary && selectedLibrary!.type === 'movie' ? (
              <ArrAction
                type="Radarr"
                arrAction={arrOption}
                settingId={radarrSettingsId}
                onUpdate={(e: number, settingId) => {
                  handleUpdateArrAction('Radarr', e, settingId)
                }}
              />
            ) : (
              <>
                <div className="form-row">
                  <label htmlFor="type" className="text-label">
                    Media type*
                    <p className="text-xs font-normal">
                      The type of TV media rules should apply to
                    </p>
                  </label>
                  <div className="form-input">
                    <div className="form-input-field">
                      <select
                        name="type"
                        id="type"
                        value={selectedType}
                        onChange={setCollectionType}
                        ref={collectionTypeRef}
                      >
                        {Object.keys(EPlexDataType)
                          .filter((v) => isNaN(Number(v)))
                          .filter((v) => v !== 'MOVIES') // We don't need movies here.
                          .map((data: string) => {
                            return (
                              <option
                                key={
                                  EPlexDataType[
                                    data as keyof typeof EPlexDataType
                                  ]
                                }
                                value={
                                  EPlexDataType[
                                    data as keyof typeof EPlexDataType
                                  ]
                                }
                              >
                                {data[0].toUpperCase() +
                                  data.slice(1).toLowerCase()}
                              </option>
                            )
                          })}
                      </select>
                    </div>
                  </div>
                </div>

                <ArrAction
                  type="Sonarr"
                  arrAction={arrOption}
                  settingId={sonarrSettingsId}
                  onUpdate={(e: number, settingId) => {
                    handleUpdateArrAction('Sonarr', e, settingId)
                  }}
                  options={
                    +selectedType === EPlexDataType.SHOWS
                      ? [
                          {
                            id: 0,
                            name: 'Delete entire show',
                          },
                          {
                            id: 1,
                            name: 'Unmonitor and delete all seasons / episodes',
                          },
                          {
                            id: 2,
                            name: 'Unmonitor and delete existing seasons / episodes',
                          },
                          {
                            id: 3,
                            name: 'Unmonitor show and keep files',
                          },
                        ]
                      : +selectedType === EPlexDataType.SEASONS
                        ? [
                            {
                              id: 0,
                              name: 'Unmonitor and delete season',
                            },
                            {
                              id: 2,
                              name: 'Unmonitor and delete existing episodes',
                            },
                            {
                              id: 3,
                              name: 'Unmonitor season and keep files',
                            },
                          ]
                        : // episodes
                          [
                            {
                              id: 0,
                              name: 'Unmonitor and delete episode',
                            },
                            {
                              id: 3,
                              name: 'Unmonitor and keep file',
                            },
                          ]
                  }
                />
              </>
            )}

            <div className="form-row">
              <label htmlFor="collection_deleteDays" className="text-label">
                Take action after days*
                <p className="text-xs font-normal">
                  Duration of days media remains in the collection before
                  deletion/unmonitor
                </p>
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <input
                    type="number"
                    name="collection_deleteDays"
                    id="collection_deleteDays"
                    defaultValue={collection ? collection.deleteAfterDays : 30}
                    ref={deleteAfterRef}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="collection_logs_months" className="text-label">
                Keep logs for months*
                <p className="text-xs font-normal">
                  Duration for which collection logs should be retained,
                  measured in months (0 = forever)
                </p>
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <input
                    type="number"
                    name="collection_logs_months"
                    id="collection_logs_months"
                    defaultValue={collection ? collection.keepLogsForMonths : 6}
                    ref={keepLogsForMonthsRef}
                  />
                </div>
              </div>
            </div>

            {tautulliEnabled && (
              <div className="form-row">
                <label
                  htmlFor="tautulli_watched_percent_override"
                  className="text-label"
                >
                  Tautulli watched percent override
                  <p className="text-xs font-normal">
                    Overrides the configured Watched Percent in Tautulli which
                    is used to determine when media is counted as watched
                  </p>
                </label>
                <div className="form-input">
                  <div className="form-input-field">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      name="tautulli_watched_percent_override"
                      id="tautulli_watched_percent_override"
                      defaultValue={
                        collection
                          ? collection.tautulliWatchedPercentOverride
                          : ''
                      }
                      ref={tautulliWatchedPercentOverrideRef}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="form-row">
              <label htmlFor="active" className="text-label">
                Active
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    className="border-zinc-600 hover:border-zinc-500 focus:border-zinc-500 focus:bg-opacity-100 focus:placeholder-zinc-400 focus:outline-none focus:ring-0"
                    defaultChecked={active}
                    onChange={() => {
                      setActive(!active)
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="collection_visible" className="text-label">
                Show on home
                <p className="text-xs font-normal">
                  Show the collection on the Plex home screen
                </p>
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <input
                    type="checkbox"
                    name="collection_visible"
                    id="collection_visible"
                    className="border-zinc-600 hover:border-zinc-500 focus:border-zinc-500 focus:bg-opacity-100 focus:placeholder-zinc-400 focus:outline-none focus:ring-0"
                    defaultChecked={showHome}
                    onChange={() => {
                      setShowHome(!showHome)
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="list_exclusions" className="text-label">
                Add list exclusions
                <p className="text-xs font-normal">
                  Prevent lists to re-add removed{' '}
                  {selectedLibrary ? selectedLibrary.type : 'movie'}
                </p>
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <input
                    type="checkbox"
                    name="list_exclusions"
                    id="list_exclusions"
                    className="border-zinc-600 hover:border-zinc-500 focus:border-zinc-500 focus:bg-opacity-100 focus:placeholder-zinc-400 focus:outline-none focus:ring-0"
                    defaultChecked={listExclusion}
                    onChange={() => {
                      setListExclusion(!listExclusion)
                    }}
                  />
                </div>
              </div>
            </div>

            {overseerrEnabled && (
              <div className="form-row">
                <label htmlFor="force_overseerr" className="text-label">
                  Force reset Overseerr record
                  <p className="text-xs font-normal">
                    Resets the Overseerr record instead of relying on
                    availability-sync
                  </p>
                </label>
                <div className="form-input">
                  <div className="form-input-field">
                    <input
                      type="checkbox"
                      name="force_overseerr"
                      id="force_overseerr"
                      className="border-zinc-600 hover:border-zinc-500 focus:border-zinc-500 focus:bg-opacity-100 focus:placeholder-zinc-400 focus:outline-none focus:ring-0"
                      defaultChecked={forceOverseerr}
                      onChange={() => {
                        setForceOverseerr(!forceOverseerr)
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="form-row">
              <label htmlFor="use_rules" className="text-label">
                Use rules
                <p className="text-xs font-normal">Toggle the rule system</p>
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <input
                    type="checkbox"
                    name="use_rules"
                    id="use_rules"
                    className="border-zinc-600 hover:border-zinc-500 focus:border-zinc-500 focus:bg-opacity-100 focus:placeholder-zinc-400 focus:outline-none focus:ring-0"
                    defaultChecked={useRules}
                    onChange={() => {
                      setUseRules(!useRules)
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="manual_collection" className="text-label">
                Custom collection
                <p className="text-xs font-normal">
                  Toggle internal collection system
                </p>
              </label>
              <div className="form-input">
                <div className="form-input-field">
                  <input
                    type="checkbox"
                    name="manual_collection"
                    id="manual_collection"
                    className="border-zinc-600 hover:border-zinc-500 focus:border-zinc-500 focus:bg-opacity-100 focus:placeholder-zinc-400 focus:outline-none focus:ring-0"
                    defaultChecked={manualCollection}
                    onChange={() => {
                      setManualCollection(!manualCollection)
                    }}
                  />
                </div>
              </div>
            </div>

            <div className={`form-row ${manualCollection ? `` : `hidden`}`}>
              <label htmlFor="manual_collection_name" className="text-label">
                Custom collection name
                <p className="text-xs font-normal">
                  Collection must exist in Plex
                </p>
              </label>

              <div className="form-input">
                <div className="form-input-field">
                  <input
                    type="text"
                    name="manual_collection_name"
                    id="manual_collection_name"
                    defaultValue={collection?.manualCollectionName}
                    ref={manualCollectionNameRef}
                  />
                </div>
              </div>
            </div>

            <hr className="mt-5" />
            <div className={`section ${useRules ? `` : `hidden`}`}>
              <div className="section">
                <div className="max-width-form-head flex">
                  <div className="ml-0">
                    <h3 className="heading">Rules</h3>
                    <p className="description">
                      Specify the rules this group needs to enforce
                    </p>
                  </div>
                  <div className="ml-auto">
                    <button
                      className="ml-3 flex h-fit rounded bg-amber-900 p-1 text-zinc-900 shadow-md hover:bg-amber-800 md:h-10"
                      onClick={toggleCommunityRuleModal}
                    >
                      {
                        <CloudDownloadIcon className="m-auto ml-4 h-6 w-6 text-zinc-200" />
                      }
                      <p className="button-text m-auto ml-1 mr-4 text-zinc-100">
                        Community
                      </p>
                    </button>
                  </div>
                </div>
                <div className="max-width-form-head mt-4 flex items-center justify-center sm:justify-end">
                  <button
                    className="ml-3 flex h-fit rounded bg-amber-600 p-1 text-zinc-900 shadow-md hover:bg-amber-500 md:h-10"
                    onClick={toggleYamlImporter}
                  >
                    {
                      <DownloadIcon className="m-auto ml-4 h-6 w-6 text-zinc-200" />
                    }
                    <p className="button-text m-auto ml-1 mr-4 text-zinc-100">
                      Import
                    </p>
                  </button>

                  <button
                    className="ml-3 flex h-fit rounded bg-amber-900 p-1 text-zinc-900 shadow-md hover:bg-amber-800 md:h-10"
                    onClick={toggleYamlExporter}
                  >
                    {
                      <UploadIcon className="m-auto ml-4 h-6 w-6 text-zinc-200" />
                    }
                    <p className="button-text m-auto ml-1 mr-4 text-zinc-100">
                      Export
                    </p>
                  </button>
                </div>
              </div>
              {CommunityModal ? (
                <CommunityRuleModal
                  currentRules={rules}
                  type={selectedLibrary ? selectedLibrary.type : 'movie'}
                  onUpdate={handleLoadRules}
                  onCancel={() => setCommunityModal(false)}
                />
              ) : undefined}
              {yamlImporterModal ? (
                <YamlImporterModal
                  yaml={yaml.current ? yaml.current : undefined}
                  onImport={(yaml: string) => {
                    importRulesFromYaml(yaml)
                    setYamlImporterModal(false)
                  }}
                  onCancel={() => {
                    setYamlImporterModal(false)
                  }}
                />
              ) : undefined}
              <RuleCreator
                key={ruleCreatorVersion.current}
                mediaType={
                  selectedLibrary
                    ? selectedLibrary.type === 'movie'
                      ? 1
                      : 2
                    : 0
                }
                dataType={+selectedType as EPlexDataType}
                editData={{ rules: rules }}
                onCancel={cancel}
                onUpdate={updateRules}
              />
            </div>
            <div className="mt-5 flex h-full w-full">
              {/* <AddButton text="Create" onClick={create} /> */}
              <div className="m-auto flex xl:m-0">
                <button
                  className="ml-auto mr-3 flex h-10 rounded bg-amber-600 text-zinc-900 shadow-md hover:bg-amber-500"
                  onClick={create}
                >
                  {<SaveIcon className="m-auto ml-5 h-6 w-6 text-zinc-200" />}
                  <p className="button-text m-auto ml-1 mr-5 text-zinc-100">
                    Save
                  </p>
                </button>

                <button
                  className="ml-auto flex h-10 rounded bg-amber-900 text-zinc-900 shadow-md hover:bg-amber-800"
                  onClick={cancel}
                >
                  {<BanIcon className="m-auto ml-5 h-6 w-6 text-zinc-200" />}
                  <p className="button-text m-auto ml-1 mr-5 text-zinc-100">
                    Cancel
                  </p>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {showArrServerChangeWarning ? (
        <Modal
          title="Warning"
          size="sm"
          onOk={() => setShowArrServerChangeWarning(false)}
        >
          <p>
            Changing server will result in all collection media and specific
            exclusions being removed.
          </p>
        </Modal>
      ) : undefined}
    </>
  )
}

export default AddModal
