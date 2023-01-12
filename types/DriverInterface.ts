interface DriverInterface
{
	GetFunctionMask(): number;
	PrepareParingDevice( device: any, paringDevice: ParingDevice ): void;
}
