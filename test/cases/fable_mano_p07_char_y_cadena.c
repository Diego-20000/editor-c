#include <stdio.h>
int main() { char T[] = "hola"; printf("[%c][%5c][%-5c][%c]\n", 'A', 'B', 'C', 65 + 256); printf("[%s][%10s][%-10s][%.2s][%10.2s][%-10.2s][%.0s][%.10s]\n", T, T, T, T, T, T, T, T); printf("[%5s][%-5s][%2s]\n", "", "", "largo"); return 0; }
