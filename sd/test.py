import serial
import time
test_string = "[serial port test]".encode('utf-8')
buff = bytearray(len(test_string))
outPort =  serial.Serial("/dev/ttyAMA1", 115200, timeout = 2, writeTimeout = 2)
inPort =  serial.Serial("/dev/ttyAMA0", 115200, timeout = 2, writeTimeout = 2)
bytes_sent = outPort.write(test_string)
outPort.close()
time.sleep(1)
bytes_read = inPort.readinto(buff)
print("%i %i %s" % (bytes_sent, bytes_read, buff))
inPort.close()
