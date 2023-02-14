import serial
import time
test_string = "[serial port test]".encode('utf-8')
#port_list = ["/dev/ttyAMA0","/dev/ttyAMA1","/dev/ttyAMA2","/dev/ttyAMA3","/dev/ttyAMA4" ]
#for port in port_list:
serialPort = serial.Serial("/dev/ttyAMA0", 9600, timeout = 2, writeTimeout = 2)
while True:
  ok = False
  #try:
  buff = bytearray(len(test_string))
  #bytes_sent = serialPort.write(test_string)
  #time.sleep(1)
  #bytes_read = serialPort.readinto(buff)
  #ok = bytes_read == bytes_sent
  #serialPort.close()
 # except IOError:
 #   pass
  buff = serialPort.read(8)
#  print("port %s is %s" % (port, "OK" if ok else "NOT OK"))
  if len(buff)>0:
    print("got %s"%(str(buff)))
