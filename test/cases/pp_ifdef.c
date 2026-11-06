#include <stdio.h>
#define X 1
int main(){
#ifdef Y
printf("Y\n");
#else
printf("noY\n");
#endif
return 0;}
