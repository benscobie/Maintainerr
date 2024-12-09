import {
  ArchiveIcon,
  ClipboardCheckIcon,
  CogIcon,
  EyeIcon,
  XIcon,
} from '@heroicons/react/outline'
import Link from 'next/link'
import { ReactNode, useContext, useEffect, useRef } from 'react'
import SearchContext from '../../../contexts/search-context'
import Transition from '../../Transition'
import VersionStatus from '../../VersionStatus'
import CachedImage from '../../Common/CachedImage'

interface NavBarLink {
  key: string
  href: string
  selected: boolean
  svgIcon: ReactNode
  name: string
}

let navBarItems: NavBarLink[] = [
  {
    key: '0',
    href: '/overview',
    selected: false,
    svgIcon: <EyeIcon className="mr-3 h-6 w-6" />,
    name: 'Overview',
  },
  {
    key: '1',
    href: '/rules',
    selected: false,
    svgIcon: <ClipboardCheckIcon className="mr-3 h-6 w-6" />,
    name: 'Rules',
  },
  {
    key: '2',
    href: '/collections',
    selected: false,
    svgIcon: <ArchiveIcon className="mr-3 h-6 w-6" />,
    name: 'Collections',
  },
  {
    key: '3',
    href: '/settings',
    selected: false,
    svgIcon: <CogIcon className="mr-3 h-6 w-6" />,
    name: 'Settings',
  },
]

interface NavBarProps {
  open?: boolean
  setClosed: () => void
}

const NavBar: React.FC<NavBarProps> = ({ open, setClosed }) => {
  const navRef = useRef<HTMLDivElement>(null)
  const SearchCtx = useContext(SearchContext)

  useEffect(() => {
    setTimeout(() => {
      if (window.location.pathname !== '/')
        setHighlight(window.location.pathname)
      else setHighlight(`/overview`)
    }, 100)
  }, [])

  useEffect(() => {
    if (SearchCtx.search.text !== '') {
      setHighlight('/overview', true)
    }
  }, [SearchCtx.search.text])

  const setHighlight = (href: string, closed = false) => {
    navBarItems = navBarItems.map((el) => {
      el.selected = href.includes(el.href)
      return el
    })

    if (closed && open) {
      setClosed()
    }
  }

  return (
    <div>
      <div className="lg:hidden">
        <Transition show={open}>
          <div className="fixed inset-0 z-40 flex">
            <Transition
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0">
                <div className="absolute inset-0 bg-zinc-900 opacity-90"></div>
              </div>
            </Transition>
            <Transition
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <>
                <div className="sidebar relative flex w-full max-w-xs flex-1 flex-col bg-zinc-800">
                  <div className="sidebar-close-button absolute right-0 top-0 -mr-14 p-1">
                    <button
                      className="flex h-12 w-12 items-center justify-center rounded-full text-white focus:bg-zinc-600 focus:outline-none"
                      aria-label="Close sidebar"
                      onClick={() => setClosed()}
                    >
                      <XIcon className="h-6 w-6 text-white" />
                    </button>
                  </div>
                  <div
                    ref={navRef}
                    className="flex h-0 flex-1 flex-col overflow-y-auto pb-8 pt-4 sm:pb-4"
                  >
                    <div className="flex flex-shrink-0 items-center px-2">
                      <span className="px-4 text-xl text-zinc-50">
                        <a href="/">
                          <CachedImage
                            width={0}
                            height={0}
                            style={{ width: '100%', height: 'auto' }}
                            src="/logo.svg"
                            alt="Logo"
                            priority
                          />
                        </a>
                      </span>
                    </div>
                    <nav className="mt-12 flex-1 space-y-4 px-4">
                      {navBarItems.map((link) => {
                        return (
                          <Link legacyBehavior key={link.key} href={link.href}>
                            <a
                              onClick={() => {
                                if (link.href === '/overview') {
                                  SearchCtx.removeText()
                                }
                                setHighlight(link.href, true)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setHighlight(link.href, true)
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className={`flex items-center rounded-md px-2 py-2 text-base font-medium leading-6 text-white transition duration-150 ease-in-out focus:outline-none ${
                                link.selected
                                  ? 'bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700'
                                  : 'hover:bg-zinc-700'
                              }`}
                            >
                              {link.svgIcon}
                              {link.name}
                            </a>
                          </Link>
                        )
                      })}
                    </nav>
                  </div>
                  <span className="mb-4">
                    <VersionStatus />
                  </span>
                </div>
                <div className="w-14 flex-shrink-0">
                  {/* <!-- Force sidebar to shrink to fit close icon --> */}
                </div>
              </>
            </Transition>
          </div>
        </Transition>
      </div>

      <div className="fixed bottom-0 left-0 top-0 z-30 hidden lg:flex lg:flex-shrink-0">
        <div className="sidebar flex w-64 flex-col">
          <div className="flex h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-4">
              <div className="flex flex-shrink-0 items-center">
                <span className="px-4 text-2xl text-zinc-50">
                  <Link href="/">
                    <CachedImage
                      width={0}
                      height={0}
                      style={{ width: '100%', height: 'auto' }}
                      src="/logo.svg"
                      alt="Logo"
                      priority
                    />
                  </Link>
                </span>
              </div>
              <nav className="mt-12 flex-1 space-y-4 px-4">
                {navBarItems.map((navBarLink) => {
                  return (
                    <Link
                      legacyBehavior
                      key={`desktop-${navBarLink.key}`}
                      href={navBarLink.href}
                    >
                      <a
                        onClick={() => {
                          if (navBarLink.href === '/overview') {
                            SearchCtx.removeText()
                          }

                          setHighlight(navBarLink.href)
                        }}
                        className={`group flex items-center rounded-md px-2 py-2 text-lg font-medium leading-6 text-white transition duration-150 ease-in-out ${
                          navBarLink.selected
                            ? 'bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700'
                            : 'hover:bg-zinc-700'
                        } focus:bg-amber-800 focus:outline-none`}
                      >
                        {navBarLink.svgIcon}
                        {navBarLink.name}
                      </a>
                    </Link>
                  )
                })}
              </nav>
              <VersionStatus />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NavBar
