import { debounce } from 'lodash'
import React, { useEffect, useState } from 'react'
import GetApiHandler, { PostApiHandler } from '../../utils/ApiHandler'
import AddButton from '../Common/AddButton'
import ExecuteButton from '../Common/ExecuteButton'
import LibrarySwitcher from '../Common/LibrarySwitcher'
import LoadingSpinner from '../Common/LoadingSpinner'
import RuleGroup, { IRuleGroup } from './RuleGroup'
import AddModal from './RuleGroup/AddModal'
import { useToasts } from 'react-toast-notifications'
import { ConstantsContextProvider } from '../../contexts/constants-context'

const Rules: React.FC = () => {
  const [addModalActive, setAddModal] = useState(false)
  const [editModalActive, setEditModal] = useState(false)
  const [data, setData] = useState()
  const [editData, setEditData] = useState<IRuleGroup>()
  const [selectedLibrary, setSelectedLibrary] = useState<number>(9999)
  const [isLoading, setIsLoading] = useState(true)
  const { addToast } = useToasts()

  const fetchData = async () => {
    if (selectedLibrary === 9999) return await GetApiHandler('/rules')
    else return await GetApiHandler(`/rules?libraryId=${selectedLibrary}`)
  }

  useEffect(() => {
    document.title = 'Maintainerr - Rules'
    fetchData().then((resp) => {
      setData(resp)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    refreshData()
  }, [selectedLibrary])

  const showAddModal = () => {
    setAddModal(!addModalActive)
  }

  const onSwitchLibrary = (libraryId: number) => {
    setSelectedLibrary(libraryId)
  }

  const refreshData = (): void => {
    fetchData().then((resp) => setData(resp))
    setAddModal(false)
    setEditModal(false)
  }

  const editHandler = (group: IRuleGroup): void => {
    setEditData(group)
    setEditModal(true)
  }

  const sync = () => {
    PostApiHandler(`/rules/execute`, {})
    addToast(
      'Initiated rule execution in the background, consult the logs for status updates.',
      {
        autoDismiss: true,
        appearance: 'success',
      },
    )
  }

  if (!data || isLoading) {
    return (
      <span>
        <LoadingSpinner />
      </span>
    )
  }

  if (addModalActive) {
    return (
      <ConstantsContextProvider>
        <AddModal
          onSuccess={refreshData}
          onCancel={() => {
            setAddModal(false)
          }}
        />
      </ConstantsContextProvider>
    )
  }

  if (editModalActive) {
    return (
      <ConstantsContextProvider>
        <AddModal
          onSuccess={refreshData}
          editData={editData}
          onCancel={() => {
            setEditModal(false)
          }}
        />
      </ConstantsContextProvider>
    )
  }

  return (
    <>
      <div className="w-full">
        <LibrarySwitcher onSwitch={onSwitchLibrary} />

        <div className="m-auto mb-5 flex">
          <div className="ml-auto sm:ml-0">
            <AddButton onClick={showAddModal} text="New Rule" />
          </div>
          <div className="ml-2 mr-auto sm:mr-0">
            <ExecuteButton
              onClick={debounce(sync, 5000, {
                leading: true,
                trailing: false,
              })}
              text="Run Rules"
            />
          </div>
        </div>

        <div>
          {(data as IRuleGroup[]).map((el) => (
            <RuleGroup
              onDelete={refreshData}
              onEdit={editHandler}
              key={el.id}
              group={el as IRuleGroup}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default Rules
