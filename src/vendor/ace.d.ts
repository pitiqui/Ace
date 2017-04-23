/**
 * Add custom properties to Window.
 */
interface Window {
    /**
     * The human readable version string that indicates the current version of Ace.
     * This version is semver compatible, which is used for checking the version. 
     */
    ACE_VERSION: string;

    /**
     * Optional flag indicating if Ace is running in developer mode.
     */
    ACE_DEV?: boolean;
}