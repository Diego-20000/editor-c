#include <stdio.h>
int main() { int I; for (I = 0; I < 8; I++) { switch (I) { case 0: printf("cero "); case 1: printf("uno "); break; case 2: case 3: printf("dos-tres "); break; default: printf("otro "); case 6: printf("seis "); break; case 7: ; } } printf("\n"); switch (I) { } switch (I) { default: printf("solo\n"); } return 0; }
